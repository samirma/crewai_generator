import { renderHook, act } from '@testing-library/react';
import { usePhases } from '../hooks/usePhases';
import { getPhases, PhaseState, PhaseStatus } from '../config/phases.config';

jest.mock('../config/phases.config', () => ({
  getPhases: jest.fn(),
}));

const mockGenerateApi = jest.fn();
const mockPlayLlmSound = jest.fn();
const mockSetIsLlmLoading = jest.fn();

// --- Updated Mock Data ---
// This data now mirrors the structure and dependencies of the actual
// phases.config.ts file, and includes the new `status` field.
const createMockPhase = (id: number, title: string, dependencies: PhaseState[], status: PhaseStatus = 'pending'): PhaseState => ({
  id,
  title,
  dependencies,
  status,
  prompt: `Prompt for ${title}`,
  defaultPrompt: `Default prompt for ${title}`,
  input: '',
  output: '',
  duration: null,
  filePath: `${title.toLowerCase().replace(/[\s.]/g, '-')}.txt`,
  outputType: 'file',
  promptFileName: `${title.toLowerCase().replace(/[\s.]/g, '-')}.md`,
  generateInputPrompt: jest.fn().mockImplementation((currentPhase: PhaseState, allPhases: PhaseState[]) => {
    const depOutputs = currentPhase.dependencies
      .map(dep => allPhases.find(p => p.id === dep.id)?.output)
      .join('\n');
    return `${depOutputs}\n${currentPhase.prompt}`;
  }),
});

const blueprintDefinitionPhase = createMockPhase(1, "Blueprint Definition", []);
const detailedAgentAndTaskDefinitionPhase = createMockPhase(2, "Detailed Agent and Task Definition", [blueprintDefinitionPhase]);
const workflow = createMockPhase(3, "Workflow", [detailedAgentAndTaskDefinitionPhase]);
const llmSelectionPhase = createMockPhase(4, "LLM Selection", [detailedAgentAndTaskDefinitionPhase]);
const toolSelectionPhase = createMockPhase(5, "Tool Selection", [detailedAgentAndTaskDefinitionPhase]);
const customToolGenerationPhase = createMockPhase(6, "Custom Tool Generation", [toolSelectionPhase]);
const agentsYamlGenerationPhase = createMockPhase(7, "Agents.yaml Generation", [detailedAgentAndTaskDefinitionPhase]);
const tasksYamlGenerationPhase = createMockPhase(8, "Tasks.yaml Generation", [detailedAgentAndTaskDefinitionPhase]);
const crewPyGenerationPhase = createMockPhase(9, "Crew.py Generation", [workflow, llmSelectionPhase, detailedAgentAndTaskDefinitionPhase, toolSelectionPhase, customToolGenerationPhase]);
const mainPyGenerationPhase = createMockPhase(10, "Main.py Generation", [crewPyGenerationPhase]);
const toolsGenerationPhase = createMockPhase(11, "Tools Generation", [customToolGenerationPhase]);
const pyProjectGenerationPhase = createMockPhase(12, "PyProject Generation", [crewPyGenerationPhase, mainPyGenerationPhase, toolsGenerationPhase]);

const mockPhases: PhaseState[] = [
  blueprintDefinitionPhase,
  detailedAgentAndTaskDefinitionPhase,
  workflow,
  llmSelectionPhase,
  toolSelectionPhase,
  customToolGenerationPhase,
  agentsYamlGenerationPhase,
  tasksYamlGenerationPhase,
  crewPyGenerationPhase,
  mainPyGenerationPhase,
  toolsGenerationPhase,
  pyProjectGenerationPhase,
];


describe('usePhases', () => {
  beforeEach(() => {
    (getPhases as jest.Mock).mockReturnValue(
      JSON.parse(JSON.stringify(mockPhases)).map((p: PhaseState) => ({
        ...p,
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
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleRunAllPhases();
    });

    expect(mockGenerateApi).toHaveBeenCalledTimes(mockPhases.length);
    for (let i = 0; i < mockPhases.length; i++) {
      expect(mockGenerateApi.mock.calls[i][0].runPhase).toBe(i + 1);
    }
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

    expect(mockGenerateApi).toHaveBeenCalledTimes(mockPhases.length);

    const calls = mockGenerateApi.mock.calls.map(call => call[0].runPhase);

    // A simple helper to verify dependency constraints
    const getPhase = (id: number) => mockPhases.find(p => p.id === id)!;
    const indexOf = (id: number) => calls.indexOf(id);

    for (const phase of mockPhases) {
        for (const dep of phase.dependencies) {
            expect(indexOf(phase.id)).toBeGreaterThan(indexOf(dep.id));
        }
    }
  });

  it('should stop parallel execution if a phase fails', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGenerateApi.mockImplementation(async ({ runPhase }) => {
      if (runPhase === 1) { // Blueprint Definition
        return { isSuccess: true, result: { output: 'Success', duration: 1 } };
      }
      if (runPhase === 2) { // Detailed Agent...
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
    // Phases that depend on the failed phase (ID 2) should not run.
    const dependentPhases = mockPhases.filter(p => p.dependencies.some(d => d.id === 2)).map(p => p.id);
    for (const id of dependentPhases) {
        expect(calls).not.toContain(id);
    }
    consoleLogSpy.mockRestore();
  });

  it('should correctly resolve dependencies and update status in parallel execution', async () => {
    // This is the most critical test for the parallel execution logic.
    mockGenerateApi.mockImplementation(async ({ runPhase }) => {
      // Assign random delays to simulate network latency
      const delay = Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
      return { isSuccess: true, result: { output: `Output ${runPhase}`, duration: delay } };
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

    expect(mockGenerateApi).toHaveBeenCalledTimes(mockPhases.length);

    const finalPyProjectPhase = result.current.phases.find(p => p.id === pyProjectGenerationPhase.id)!;

    // Check that the final phase's input contains the output from its direct dependencies
    for (const dep of finalPyProjectPhase.dependencies) {
        expect(finalPyProjectPhase.input).toContain(`Output ${dep.id}`);
    }

    // Check that all phases are marked as 'completed'
    result.current.phases.forEach(p => {
        expect(p.status).toBe('completed');
    });
  });
});
