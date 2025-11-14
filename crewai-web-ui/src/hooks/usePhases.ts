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

    const executePhase = async (phaseId: number): Promise<boolean> => {
      inProgressPhases.add(phaseId);
      const { newPhases, success } = await handlePhaseExecution(
        phaseId,
        currentPhases
      );
      currentPhases = newPhases;

      if (success) {
        completedPhases.add(phaseId);
      }
      inProgressPhases.delete(phaseId);
      return success;
    };

    const pendingPromises = new Set<Promise<boolean>>();
    const allExecutedPromises: Promise<boolean>[] = [];

    while (completedPhases.size < phases.length) {
      const readyPhases = phases.filter(
        (phase) =>
          !completedPhases.has(phase.id) &&
          !inProgressPhases.has(phase.id) &&
          phase.dependencies.every((depId) => completedPhases.has(depId))
      );

      for (const phase of readyPhases) {
        const promise = executePhase(phase.id);
        promise.finally(() => {
          pendingPromises.delete(promise);
        });
        pendingPromises.add(promise);
        allExecutedPromises.push(promise);
      }

      if (pendingPromises.size === 0) {
        if (completedPhases.size < phases.length) {
          const remainingPhases = phases.filter((p) => !completedPhases.has(p.id));
          const remainingPhaseNames = remainingPhases.map((p) => p.name).join(', ');
          setError(
            `Failed to run all phases. Could not resolve dependencies for: ${remainingPhaseNames}`
          );
        }
        break;
      }

      await Promise.race(pendingPromises);
    }

    const results = await Promise.all(allExecutedPromises);
    const overallSuccess = results.every((res) => res);

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