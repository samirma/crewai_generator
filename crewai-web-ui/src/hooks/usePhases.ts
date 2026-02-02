import { useState, useEffect, useRef } from 'react';
import { getPhases, PhaseState } from '../config/phases.config';

export const usePhases = (
  initialInput: string,
  llmModel: string,
  playLlmSound: () => void,
  generateApi: (payload: any, signal?: AbortSignal) => Promise<any>
) => {
  const [phases, setPhases] = useState<PhaseState[]>(getPhases());
  const [isRunAllLoading, setIsRunAllLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchInitialPrompts = async () => {
      try {
        const phasesWithPrompts = await Promise.all(
          phases.map(async phase => {
            if (phase.promptFileName) {
              const response = await fetch(`/prompts/${phase.promptFileName}`);
              const prompt = await response.text();
              return { ...phase, prompt, defaultPrompt: prompt };
            }
            return phase;
          })
        );
        setPhases(phasesWithPrompts);
      } catch (e) {
        console.error("Error fetching initial prompts:", e);
      }
    };
    fetchInitialPrompts();
  }, []);

  const handlePhaseExecution = async (
    phaseId: number,
    phasesForExecution: PhaseState[] = phases,
    signal?: AbortSignal
  ): Promise<{ newPhases: PhaseState[]; success: boolean; isAborted?: boolean }> => {
    // Check if aborted before starting
    if (signal?.aborted) {
      return { newPhases: phasesForExecution, success: false, isAborted: true };
    }

    const currentPhase = phasesForExecution.find(p => p.id === phaseId);
    if (!currentPhase) {
      return { newPhases: phasesForExecution, success: false };
    }

    for (const dep of currentPhase.dependencies) {
      const depState = phasesForExecution.find(p => p.id === dep.id);
      if (!depState || depState.status !== 'completed') {
        const errorMessage = `Cannot run phase ${currentPhase.title} because its dependency ${dep.title} has not completed successfully.`;
        setError(errorMessage);
        // Mark the current phase as failed
        const finalPhases = phasesForExecution.map(p => p.id === phaseId ? { ...p, status: 'failed' as const } : p);
        setPhases(finalPhases);
        return { newPhases: finalPhases, success: false };
      }
    }

    const fullPromptValue = currentPhase.generateInputPrompt(currentPhase, phasesForExecution, initialInput);

    const updatedPhasesWithInput = phasesForExecution.map(p =>
      p.id === phaseId ? { ...p, output: '', input: fullPromptValue, status: 'running' as const, tokensPerSecond: null, duration: null } : p
    );
    setPhases(updatedPhasesWithInput);

    // Check if aborted before API call
    if (signal?.aborted) {
      const finalPhases = updatedPhasesWithInput.map(p =>
        p.id === phaseId ? { ...p, status: 'failed' as const } : p
      );
      setPhases(finalPhases);
      return { newPhases: finalPhases, success: false, isAborted: true };
    }

    const response = await generateApi({
      llmModel,
      mode: 'advanced',
      runPhase: phaseId,
      fullPrompt: fullPromptValue,
      filePath: currentPhase.filePath,
      outputType: currentPhase.outputType,
    }, signal);

    // Check if aborted after API call
    if (response.isAborted || signal?.aborted) {
      const finalPhases = updatedPhasesWithInput.map(p =>
        p.id === phaseId ? { ...p, status: 'failed' as const } : p
      );
      setPhases(finalPhases);
      setError("Execution was cancelled by user.");
      return { newPhases: finalPhases, success: false, isAborted: true };
    }

    let finalPhases: PhaseState[];

    if (response.isSuccess) {
      const result = response.result;
      finalPhases = updatedPhasesWithInput.map(p =>
        p.id === phaseId ? { ...p, output: result.output, duration: result.duration, tokensPerSecond: result.tokensPerSecond, status: 'completed' as const } : p
      );
      setPhases(finalPhases);
      playLlmSound();
      return { newPhases: finalPhases, success: true }; // --- Return success
    } else {
      const errorMessage = response.errorMessage || "An unknown error occurred.";
      setError(errorMessage);
      console.log("Error executing phase:", errorMessage);
      finalPhases = updatedPhasesWithInput.map(p =>
        p.id === phaseId ? { ...p, status: 'failed' as const } : p
      );
      setPhases(finalPhases);
      return { newPhases: finalPhases, success: false }; // --- Return failure
    }
  };

  const handleRunAllPhases = async () => {
    setIsRunAllLoading(true);
    setError(null); // Clear previous errors

    // Create new abort controller for this run
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let currentPhases: PhaseState[] = phases.map((p) => ({ ...p, status: 'pending' as const }));
    setPhases(currentPhases);

    let runAllSuccess = true;
    let isAborted = false;

    for (const phase of phases) {
      // Check if aborted before each phase
      if (signal.aborted) {
        isAborted = true;
        break;
      }

      const { newPhases, success, isAborted: phaseAborted } = await handlePhaseExecution(phase.id, currentPhases, signal);
      currentPhases = newPhases;

      if (phaseAborted) {
        isAborted = true;
        break;
      }

      if (!success) {
        runAllSuccess = false; // Mark the overall run as failed
        break; // Stop the loop immediately
      }
    }

    if (isAborted) {
      // Mark only the running phase as failed, leave pending phases as pending
      currentPhases = currentPhases.map(p =>
        p.status === 'running' ? { ...p, status: 'failed' as const } : p
      );
      setPhases(currentPhases);
      setError("Execution was cancelled by user.");
    }

    abortControllerRef.current = null;
    setIsRunAllLoading(false);
    return runAllSuccess && !isAborted; // Return the final status
  };

  const handleRunAllPhasesInParallel = async () => {
    setIsRunAllLoading(true);
    setError(null);

    // Create new abort controller for this run
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let currentPhases: PhaseState[] = phases.map((p) => ({ ...p, status: 'pending' as const }));
    setPhases(currentPhases); // Set initial status for all phases

    const completedPhases = new Set<number>();
    const inProgressPhases = new Set<number>();
    let overallSuccess = true;
    let isAborted = false;

    const pendingPromises = new Map<number, Promise<any>>();

    while (completedPhases.size < phases.length && overallSuccess && !isAborted) {
      // Check if aborted at start of each iteration
      if (signal.aborted) {
        isAborted = true;
        break;
      }

      const readyPhases = currentPhases.filter(
        (phase) =>
          !completedPhases.has(phase.id) &&
          !inProgressPhases.has(phase.id) &&
          phase.dependencies.every((dep) => completedPhases.has(dep.id))
      );

      if (readyPhases.length > 0) {
        const runningPhaseIds = readyPhases.map((p) => p.id);
        const phasesWithRunning = currentPhases.map((p) =>
          runningPhaseIds.includes(p.id) ? { ...p, status: 'running' as const } : p
        );
        setPhases(phasesWithRunning)
        currentPhases = phasesWithRunning;
      }


      for (const phase of readyPhases) {
        inProgressPhases.add(phase.id);

        const executionPromise = handlePhaseExecution(phase.id, currentPhases, signal)
          .then((result) => ({ ...result, phaseId: phase.id }));

        pendingPromises.set(phase.id, executionPromise);
      }

      if (pendingPromises.size === 0) {
        if (completedPhases.size < phases.length) {
          const remainingPhases = currentPhases.filter((p) => !completedPhases.has(p.id));
          const remainingPhaseNames = remainingPhases.map((p) => p.title).join(', ');
          setError(`Failed to run all phases. Could not resolve dependencies for: ${remainingPhaseNames}`);
          overallSuccess = false;
        }
        break;
      }

      try {
        const promisesWithId = Array.from(pendingPromises.values());
        const finishedResult = await Promise.race(promisesWithId);

        const { phaseId, newPhases, success, isAborted: phaseAborted } = finishedResult;

        if (phaseAborted) {
          isAborted = true;
          break;
        }

        const finishedPhase = newPhases.find((p: PhaseState) => p.id === phaseId);
        if (finishedPhase) {
          currentPhases = currentPhases.map((p: PhaseState) => (p.id === phaseId ? finishedPhase : p));
        }

        setPhases(currentPhases);

        pendingPromises.delete(phaseId);
        inProgressPhases.delete(phaseId);

        if (success) {
          completedPhases.add(phaseId);
        } else {
          setError(`Phase "${newPhases.find((p: PhaseState) => p.id === phaseId)?.title}" failed.`);
          overallSuccess = false;
        }
      } catch (error) {
        // Check if the error is due to abort
        if (signal.aborted) {
          isAborted = true;
          break;
        }
        console.error('An unexpected error occurred during phase execution:', error);
        setError('An unexpected error occurred. Check the console for details.');
        overallSuccess = false;
        break;
      }
    }

    if (isAborted) {
      // Mark only the running phases as failed, leave pending phases as pending
      currentPhases = currentPhases.map(p =>
        p.status === 'running' ? { ...p, status: 'failed' as const } : p
      );
      setPhases(currentPhases);
      setError("Execution was cancelled by user.");
    }

    abortControllerRef.current = null;
    setIsRunAllLoading(false);
    return overallSuccess && !isAborted;
  };

  const stopRunAllPhases = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("Execution cancelled by user.");
    }
  };

  return {
    phases,
    setPhases,
    handlePhaseExecution: (phaseId: number, phasesForExecution?: PhaseState[]) => {
      setError(null);
      return handlePhaseExecution(phaseId, phasesForExecution).then(result => result.newPhases);
    },
    handleRunAllPhases,
    handleRunAllPhasesInParallel,
    stopRunAllPhases,
    isRunAllLoading,
    error,
  };
};
