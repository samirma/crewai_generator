import { renderHook, act } from '@testing-library/react';
import { usePhases } from '../hooks/usePhases';
import { getPhases, PhaseState } from '../config/phases.config';

jest.mock('../config/phases.config', () => ({
  getPhases: jest.fn(),
}));

const mockGenerateApi = jest.fn();
const mockPlayLlmSound = jest.fn();
const mockSetIsLlmLoading = jest.fn();

// --- Corrected Mock Data ---
// Added all required properties from the PhaseState interface to ensure
// the mock objects are fully compliant. This was the likely source of the
// previous test failures.
const createMockPhase = (id: number, title: string, dependencies: PhaseState[]): PhaseState => ({
  id,
  title,
  dependencies,
  prompt: `Prompt for ${title}`,
  defaultPrompt: `Default prompt for ${title}`,
  input: '',
  output: '',
  isLoading: false,
  isTimerRunning: false,
  duration: null,
  filePath: `${title.toLowerCase().replace(' ', '-')}.txt`,
  outputType: 'file',
  promptFileName: `${title.toLowerCase().replace(' ', '-')}.md`,
  generateInputPrompt: jest.fn().mockImplementation((currentPhase: PhaseState, allPhases: PhaseState[]) => {
    const depOutputs = currentPhase.dependencies
      .map(dep => allPhases.find(p => p.id === dep.id)?.output)
      .join('\n');
    return `${depOutputs}\n${currentPhase.prompt}`;
  }),
});

const phase1 = createMockPhase(1, 'Phase 1', []);
const phase2 = createMockPhase(2, 'Phase 2', [phase1]);
const phase3 = createMockPhase(3, 'Phase 3', [phase1]);
const phase4 = createMockPhase(4, 'Phase 4', [phase2, phase3]);
const mockPhases: PhaseState[] = [phase1, phase2, phase3, phase4];


describe('usePhases', () => {
  beforeEach(() => {
    // Reset the mock functions and mockReturnValue for getPhases
    (getPhases as jest.Mock).mockReturnValue(
      // Deep copy to prevent state from leaking between tests
      JSON.parse(JSON.stringify(mockPhases)).map((p: PhaseState) => ({
        ...p,
        // Restore mock function for generateInputPrompt
        generateInputPrompt: jest.fn().mockImplementation((currentPhase: PhaseState, allPhases: PhaseState[]) => {
          const depOutputs = currentPhase.dependencies
            .map(dep => {
              const foundDep = allPhases.find(phase => phase.id === dep.id);
              return foundDep ? foundDep.output : '';
            })
            .join('\n');
          return `${depOutputs}\n${currentPhase.prompt}`;
        }),
      }))
    );
    mockGenerateApi.mockClear();
    mockPlayLlmSound.mockClear();
    mockSetIsLlmLoading.mockClear();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve('Mocked prompt'),
      })
    ) as jest.Mock;
  });

  it('should run all phases sequentially in order', async () => {
    mockGenerateApi.mockResolvedValue({
      isSuccess: true,
      result: { output: 'Success', duration: 1 },
    });

    const { result } = renderHook(() =>
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi, mockSetIsLlmLoading)
    );

    await act(async () => {
      // Added a slight delay to allow useEffect to fetch prompts
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleRunAllPhases();
    });

    expect(mockGenerateApi).toHaveBeenCalledTimes(4);
    expect(mockGenerateApi.mock.calls[0][0].runPhase).toBe(1);
    expect(mockGenerateApi.mock.calls[1][0].runPhase).toBe(2);
    expect(mockGenerateApi.mock.calls[2][0].runPhase).toBe(3);
    expect(mockGenerateApi.mock.calls[3][0].runPhase).toBe(4);
  });

  it('should stop sequential execution if a phase fails', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGenerateApi
      .mockResolvedValueOnce({
        isSuccess: true,
        result: { output: 'Success', duration: 1 },
      })
      .mockResolvedValueOnce({ isSuccess: false, errorMessage: 'Failed' });

    const { result } = renderHook(() =>
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi, mockSetIsLlmLoading)
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleRunAllPhases();
    });

    expect(mockGenerateApi).toHaveBeenCalledTimes(2);
    consoleLogSpy.mockRestore();
  });

  it('should run all phases in parallel respecting dependencies', async () => {
    mockGenerateApi.mockResolvedValue({
      isSuccess: true,
      result: { output: 'Success', duration: 1 },
    });

    const { result } = renderHook(() =>
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi, mockSetIsLlmLoading)
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleRunAllPhasesInParallel();
    });

    expect(mockGenerateApi).toHaveBeenCalledTimes(4);

    const calls = mockGenerateApi.mock.calls.map(call => call[0].runPhase);
    expect(calls[0]).toBe(1);
    expect([calls[1], calls[2]]).toContain(2);
    expect([calls[1], calls[2]]).toContain(3);
    expect(calls[3]).toBe(4);
  });

  it('should stop parallel execution if a phase fails', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGenerateApi.mockImplementation(async ({ runPhase }) => {
      if (runPhase === 1) {
        return { isSuccess: true, result: { output: 'Success', duration: 1 } };
      }
      if (runPhase === 2) {
        return { isSuccess: false, errorMessage: 'Phase 2 failed' };
      }
      return { isSuccess: true, result: { output: `Success for ${runPhase}`, duration: 1 } };
    });

    const { result } = renderHook(() =>
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi, mockSetIsLlmLoading)
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleRunAllPhasesInParallel();
    });

    const calls = mockGenerateApi.mock.calls.map(call => call[0].runPhase);
    expect(calls.length).toBeLessThanOrEqual(3);
    expect(calls).not.toContain(4);
    consoleLogSpy.mockRestore();
  });

  it('should correctly resolve dependencies in parallel execution even with varying delays', async () => {
    mockGenerateApi.mockImplementation(async ({ runPhase }) => {
      if (runPhase === 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { isSuccess: true, result: { output: 'Output 1', duration: 50 } };
      }
      if (runPhase === 2) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { isSuccess: true, result: { output: 'Output 2', duration: 200 } };
      }
      if (runPhase === 3) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { isSuccess: true, result: { output: 'Output 3', duration: 100 } };
      }
      if (runPhase === 4) {
        return { isSuccess: true, result: { output: 'Output 4', duration: 10 } };
      }
      return { isSuccess: false, errorMessage: 'Unknown phase' };
    });

    const { result } = renderHook(() =>
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi, mockSetIsLlmLoading)
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleRunAllPhasesInParallel();
    });

    expect(mockGenerateApi).toHaveBeenCalledTimes(4);

    const phase4Call = mockGenerateApi.mock.calls.find(call => call[0].runPhase === 4);
    expect(phase4Call).toBeDefined();

    // Re-fetch the mock function from the *current* state of the hook
    const finalPhases = result.current.phases;
    const phase4Config = finalPhases.find(p => p.id === 4)!;

    // The input property of the phase is the result of generateInputPrompt
    // This is a more robust way to check the final state.
    expect(phase4Config.input).toContain('Output 2');
    expect(phase4Config.input).toContain('Output 3');
  });
});
