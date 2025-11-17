import { useState, useEffect } from 'react';
import { getPhases, PhaseState } from '../config/phases.config';

export const usePhases = (
  initialInput: string,
  llmModel: string,
  playLlmSound: () => void,
  generateApi: (payload: any) => Promise<any>
) => {
  const [phases, setPhases] = useState<PhaseState[]>(getPhases());
  const [isRunAllLoading, setIsRunAllLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    phasesForExecution: PhaseState[] = phases
  ): Promise<{ newPhases: PhaseState[]; success: boolean }> => {
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
      p.id === phaseId ? { ...p, input: fullPromptValue, status: 'running' as const } : p
    );
    setPhases(updatedPhasesWithInput);

    const response = await generateApi({
      llmModel,
      mode: 'advanced',
      runPhase: phaseId,
      fullPrompt: fullPromptValue,
      filePath: currentPhase.filePath,
      outputType: currentPhase.outputType,
    });

    let finalPhases: PhaseState[];

    if (response.isSuccess) {
      const result = response.result;
      finalPhases = updatedPhasesWithInput.map(p =>
        p.id === phaseId ? { ...p, output: result.output, duration: result.duration, status: 'completed' as const } : p
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

    let currentPhases = phases;
    let runAllSuccess = true; 

    for (const phase of phases) {
      const { newPhases, success } = await handlePhaseExecution(phase.id, currentPhases);
      currentPhases = newPhases;

      if (!success) {
        runAllSuccess = false; // Mark the overall run as failed
        break; // Stop the loop immediately
      }
    }

    setIsRunAllLoading(false);
    return runAllSuccess; // Return the final status
  };

  const handleRunAllPhasesInParallel = async () => {
    setIsRunAllLoading(true);
    setError(null);

    let currentPhases = phases.map((p) => ({ ...p, status: 'pending' as const }));
    setPhases(currentPhases); // Set initial status for all phases

    const completedPhases = new Set<number>();
    const inProgressPhases = new Set<number>();
    let overallSuccess = true;

    const pendingPromises = new Map<number, Promise<any>>();

    while (completedPhases.size < phases.length && overallSuccess) {
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

        const executionPromise = handlePhaseExecution(phase.id, currentPhases)
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

        const { phaseId, newPhases, success } = finishedResult;

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
        console.error('An unexpected error occurred during phase execution:', error);
        setError('An unexpected error occurred. Check the console for details.');
        overallSuccess = false;
        break;
      }
    }

    try {
      await Promise.all(pendingPromises.values());
    } catch (e) {
      console.error('Additional errors from remaining phases:', e);
    }

    setIsRunAllLoading(false);
    return overallSuccess;
  };

  return {
    phases,
    setPhases,
    handlePhaseExecution: (phaseId: number, phasesForExecution?: PhaseState[]) =>
      handlePhaseExecution(phaseId, phasesForExecution).then(result => result.newPhases),
    handleRunAllPhases,
    handleRunAllPhasesInParallel,
    isRunAllLoading,
    error,
  };
};
