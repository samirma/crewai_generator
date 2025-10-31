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

  const handlePhaseExecution = async (phaseId: number) => {
    const currentPhase = phases.find(p => p.id === phaseId);
    if (!currentPhase) return;

    const fullPromptValue = currentPhase.generateInputPrompt(currentPhase, phases, initialInput);

    setPhases(currentPhases =>
      currentPhases.map(p =>
        p.id === phaseId ? { ...p, input: fullPromptValue, isLoading: true, isTimerRunning: true } : p
      )
    );
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
      setPhases(currentPhases =>
        currentPhases.map(p =>
          p.id === phaseId ? { ...p, output: result.output, duration: result.duration, isLoading: false, isTimerRunning: false } : p
        )
      );
      playLlmSound();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      console.error("Error executing phase:", err);
      setPhases(currentPhases =>
        currentPhases.map(p =>
          p.id === phaseId ? { ...p, isLoading: false, isTimerRunning: false } : p
        )
      );
    } finally {
      setCurrentActivePhase(null);
    }
  };

  const handleRunAllPhases = async () => {
    setIsRunAllLoading(true);
    setError(null);
    let errorOccurred = false;

    for (const phase of phases) {
      await handlePhaseExecution(phase.id);
      if (error) {
        errorOccurred = true;
        break;
      }
    }

    setIsRunAllLoading(false);
    return !errorOccurred;
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
