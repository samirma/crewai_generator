import { renderHook, act, waitFor } from '@testing-library/react';
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
              const foundDep = allPhases.find((phase: PhaseState) => phase.id === dep.id);
              return foundDep ? foundDep.output : '';
            })
            .join('\n');
          return `${depOutputs}\n${currentPhase.prompt}`;
        }),
      }))
    );
    mockGenerateApi.mockClear();
    mockPlayLlmSound.mockClear();

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
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi)
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
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi)
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
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi)
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
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi)
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
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi)
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

  it('should set multiple phases to "running" simultaneously in parallel execution', async () => {
    const resolvers = new Map<number, (value: any) => void>();
    const promises = new Map<number, Promise<any>>();

    mockGenerateApi.mockImplementation(async ({ runPhase }) => {
      const promise = new Promise(resolve => {
        resolvers.set(runPhase, resolve);
      });
      promises.set(runPhase, promise);
      return promise;
    });

    const { result } = renderHook(() =>
      usePhases('initial', 'model', mockPlayLlmSound, mockGenerateApi)
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.handleRunAllPhasesInParallel();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const phase1Resolver = resolvers.get(1);
    expect(phase1Resolver).toBeDefined();

    act(() => {
      if(phase1Resolver) {
        phase1Resolver({ isSuccess: true, result: { output: 'Output 1', duration: 10 } });
      }
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const phase2Resolver = resolvers.get(2);
    expect(phase2Resolver).toBeDefined();

    const runningPhases = result.current.phases.filter(p => p.status === 'running');
    expect(runningPhases.length).toBe(1);
    expect(runningPhases[0].id).toBe(2);

    act(() => {
      if(phase2Resolver) {
        phase2Resolver({ isSuccess: true, result: { output: 'Output 2', duration: 10 } });
      }
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const runningPhasesAfter2 = result.current.phases.filter(p => p.status === 'running');
    const runningIds = runningPhasesAfter2.map(p => p.id);

    expect(runningPhasesAfter2.length).toBe(5);
    expect(runningIds).toContain(3);
    expect(runningIds).toContain(4);
    expect(runningIds).toContain(5);
    expect(runningIds).toContain(7);
    expect(runningIds).toContain(8);

    const remainingResolvers = Array.from(resolvers.keys()).filter(id => id > 2);
    act(() => {
      remainingResolvers.forEach(id => {
        const resolver = resolvers.get(id);
        if (resolver) {
          resolver({ isSuccess: true, result: { output: `Output ${id}`, duration: 10 } });
        }
      });
    });
  }, 10000);
});
