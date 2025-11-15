import { renderHook, act } from '@testing-library/react';
import { usePhases } from '../hooks/usePhases';
import { getPhases, PhaseState } from '../config/phases.config';

jest.mock('../config/phases.config', () => ({
  getPhases: jest.fn(),
}));

const mockGenerateApi = jest.fn();
const mockPlayLlmSound = jest.fn();
const mockSetIsLlmLoading = jest.fn();

const mockPhases: PhaseState[] = [];
const phase1: PhaseState = {
  id: 1,
  name: 'Phase 1',
  dependencies: [],
  generateInputPrompt: jest.fn().mockReturnValue('Prompt 1'),
  prompt: 'Prompt 1',
  output: '',
  input: '',
};
const phase2: PhaseState = {
  id: 2,
  name: 'Phase 2',
  dependencies: [phase1],
  generateInputPrompt: jest.fn().mockReturnValue('Prompt 2'),
  prompt: 'Prompt 2',
  output: '',
  input: '',
};
const phase3: PhaseState = {
  id: 3,
  name: 'Phase 3',
  dependencies: [phase1],
  generateInputPrompt: jest.fn().mockReturnValue('Prompt 3'),
  prompt: 'Prompt 3',
  output: '',
  input: '',
};
const phase4: PhaseState = {
  id: 4,
  name: 'Phase 4',
  dependencies: [phase2, phase3],
  generateInputPrompt: jest.fn().mockReturnValue('Prompt 4'),
  prompt: 'Prompt 4',
  output: '',
  input: '',
};
mockPhases.push(phase1, phase2, phase3, phase4);

describe('usePhases', () => {
  beforeEach(() => {
    (getPhases as jest.Mock).mockReturnValue(
      mockPhases.map(p => ({ ...p, generateInputPrompt: jest.fn().mockReturnValue(p.prompt) }))
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
      await result.current.handleRunAllPhasesInParallel();
    });

    expect(mockGenerateApi).toHaveBeenCalledTimes(4);

    const calls = mockGenerateApi.mock.calls.map(call => call[0].runPhase);
    expect(calls[0]).toBe(1); // Phase 1 runs first
    expect([calls[1], calls[2]]).toContain(2); // Phases 2 and 3 run after 1
    expect([calls[1], calls[2]]).toContain(3);
    expect(calls[3]).toBe(4); // Phase 4 runs after 2 and 3
  });

  it('should stop parallel execution if a phase fails', async () => {
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
      await result.current.handleRunAllPhasesInParallel();
    });

    const calls = mockGenerateApi.mock.calls.map(call => call[0].runPhase);
    expect(calls.length).toBeLessThanOrEqual(3);
    expect(calls).not.toContain(4);
    consoleLogSpy.mockRestore();
  });

  it('should not execute a phase if its dependencies are not met', async () => {
    const { result } = renderHook(() =>
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi, mockSetIsLlmLoading)
    );

    // Attempt to run phase 2, which depends on phase 1. Phase 1 has no output.
    await act(async () => {
      await result.current.handlePhaseExecution(2);
    });

    // The API call should not have been made
    expect(mockGenerateApi).not.toHaveBeenCalled();

    // An error should be set
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toEqual(
      `Cannot run phase ${phase2.name} because its dependency ${phase1.name} has not completed successfully.`
    );
  });
});
