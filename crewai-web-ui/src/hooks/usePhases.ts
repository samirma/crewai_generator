import { useState, useEffect } from 'react';
import { getPhases, PhaseState } from '../config/phases.config';
import { useGenerationApi } from './useGenerationApi';

export const usePhases = (initialInput: string, llmModel: string, playLlmSound: () => void) => {
  const [phases, setPhases] = useState<PhaseState[]>(getPhases());
  const { generate: generateApi } = useGenerationApi();
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

  const handlePhaseExecution = async (phaseId: number, phasesForExecution: PhaseState[] = phases): Promise<PhaseState[]> => {
    const currentPhase = phasesForExecution.find(p => p.id === phaseId);
    if (!currentPhase) return phasesForExecution;

    const fullPromptValue = currentPhase.generateInputPrompt(currentPhase, phasesForExecution, initialInput);

    const updatedPhasesWithInput = phasesForExecution.map(p =>
      p.id === phaseId ? { ...p, input: fullPromptValue, isLoading: true, isTimerRunning: true, error: null } : p
    );
    setPhases(updatedPhasesWithInput);
    setCurrentActivePhase(phaseId);

    try {
      const result = await generateApi({
        llmModel,
        mode: 'advanced',
        runPhase: phaseId,
        fullPrompt: fullPromptValue,
        filePath: currentPhase.filePath,
        outputType: currentPhase.outputType,
      });

      const finalPhases = updatedPhasesWithInput.map(p =>
        p.id === phaseId ? { ...p, output: result.output, duration: result.duration, isLoading: false, isTimerRunning: false } : p
      );
      setPhases(finalPhases);
      playLlmSound();
      return finalPhases;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Error executing phase:", err);
      const finalPhases = updatedPhasesWithInput.map(p =>
        p.id === phaseId ? { ...p, isLoading: false, isTimerRunning: false, error: errorMessage } : p
      );
      setPhases(finalPhases);
      // Re-throw the error to be caught by handleRunAllPhases
      throw err;
    } finally {
      setCurrentActivePhase(null);
    }
  };

  const handleRunAllPhases = async () => {
    setIsRunAllLoading(true);
    setError(null);

    let currentPhases = phases.map(p => ({ ...p, output: "", error: null })); // Reset outputs and errors
    setPhases(currentPhases);

    let success = true;
    try {
      for (const phase of currentPhases) {
        const newPhases = await handlePhaseExecution(phase.id, currentPhases);
        currentPhases = newPhases;
      }
    } catch (err) {
      console.error("Halting 'Run All' due to an error in a phase.", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during phase execution.";
      setError(errorMessage);
      success = false;
    } finally {
      setIsRunAllLoading(false);
    }
    return success;
  };

  return {
    phases,
    setPhases,
    handlePhaseExecution,
    handleRunAllPhases,
    currentActivePhase,
    isRunAllLoading,
    error,
  };
};
