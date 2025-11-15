import { useState, useEffect } from 'react';
import { getPhases, PhaseState } from '../config/phases.config';
import { useGenerationApi } from './useGenerationApi';

export const usePhases = (
  initialInput: string,
  llmModel: string,
  playLlmSound: () => void,
  generateApi: (payload: any) => Promise<any>,
  setIsLlmLoading: (loading: boolean) => void
) => {
  const [phases, setPhases] = useState<PhaseState[]>(getPhases());
  const [currentActivePhase, setCurrentActivePhase] = useState<number | null>(null);
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

  // --- MODIFICATION: This function now returns an object indicating success ---
  const handlePhaseExecution = async (
    phaseId: number,
    phasesForExecution: PhaseState[] = phases
  ): Promise<{ newPhases: PhaseState[]; success: boolean }> => {
    const currentPhase = phasesForExecution.find(p => p.id === phaseId);
    if (!currentPhase) {
      return { newPhases: phasesForExecution, success: false };
    }

    const fullPromptValue = currentPhase.generateInputPrompt(currentPhase, phasesForExecution, initialInput);

    const updatedPhasesWithInput = phasesForExecution.map(p =>
      p.id === phaseId ? { ...p, input: fullPromptValue, isLoading: true, isTimerRunning: true } : p
    );
    setPhases(updatedPhasesWithInput);
    setCurrentActivePhase(phaseId);

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
        p.id === phaseId ? { ...p, output: result.output, duration: result.duration, isLoading: false, isTimerRunning: false } : p
      );
      setPhases(finalPhases);
      playLlmSound();
      setCurrentActivePhase(null);
      return { newPhases: finalPhases, success: true }; // --- Return success
    } else {
      const errorMessage = response.errorMessage || "An unknown error occurred.";
      setError(errorMessage);
      console.log("Error executing phase:", errorMessage);
      finalPhases = updatedPhasesWithInput.map(p =>
        p.id === phaseId ? { ...p, isLoading: false, isTimerRunning: false } : p
      );
      setPhases(finalPhases);
      setCurrentActivePhase(null);
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

    let currentPhases = [...phases];
    const completedPhases = new Set<number>();
    const inProgressPhases = new Set<number>();
    let overallSuccess = true;

    // A map of promises for phases that are currently running
    const pendingPromises = new Map<number, Promise<{ newPhases: PhaseState[]; success: boolean }>>();

    while (completedPhases.size < phases.length) {
      // Find phases that are ready to run
      const readyPhases = currentPhases.filter(
        (phase) =>
          !completedPhases.has(phase.id) &&
          !inProgressPhases.has(phase.id) &&
          phase.dependencies.every((dep) => completedPhases.has(dep.id))
      );

      // Launch all ready phases
      for (const phase of readyPhases) {
        inProgressPhases.add(phase.id);
        const promise = handlePhaseExecution(phase.id, currentPhases);
        pendingPromises.set(phase.id, promise);
      }

      // If there are no running phases and we're not done, it's a deadlock
      if (pendingPromises.size === 0) {
        if (completedPhases.size < phases.length) {
          const remainingPhases = currentPhases.filter(p => !completedPhases.has(p.id));
          const remainingPhaseNames = remainingPhases.map(p => p.title).join(', ');
          setError(`Failed to run all phases. Could not resolve dependencies for: ${remainingPhaseNames}`);
          overallSuccess = false;
        }
        break;
      }

      // Create promises that resolve with their phase ID
      const promisesWithId = Array.from(pendingPromises.entries()).map(([phaseId, promise]) =>
        promise.then(result => ({ ...result, phaseId }))
      );

      // Wait for any of the running phases to complete
      const finishedResult = await Promise.race(promisesWithId);
      const { phaseId, newPhases, success } = finishedResult;

      // Update the main state with the result of the completed phase
      currentPhases = newPhases;

      // Update tracking sets
      pendingPromises.delete(phaseId);
      inProgressPhases.delete(phaseId);
      if (success) {
        completedPhases.add(phaseId);
      } else {
        // A phase failed, so we stop the process
        setError(`Phase ${phaseId} failed.`);
        overallSuccess = false;
        break;
      }
    }

    // Wait for any remaining promises to finish to avoid orphaned processes
    try {
      await Promise.all(pendingPromises.values());
    } catch (e) {
      // Errors from already-failed phases might surface here; we can ignore them as we've already handled the failure.
      console.error("Additional errors from remaining phases:", e);
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
    handleRunAllPhasesInParallel, // --- Add new function to return object
    currentActivePhase,
    isRunAllLoading,
    error,
  };
};