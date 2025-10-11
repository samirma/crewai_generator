"use client";

import PhaseComponent from '@/app/components/PhaseComponent';

interface GenerationTabProps {
  currentActivePhase: number | null;
  isLoadingMultiStepPhase_1: boolean;
  isLoadingMultiStepPhase_2: boolean;
  isLoadingMultiStepPhase_3: boolean;
  phase1Prompt: string;
  setPhase1Prompt: (value: string) => void;
  phase2Prompt: string;
  setPhase2Prompt: (value: string) => void;
  phase3Prompt: string;
  setPhase3Prompt: (value: string) => void;
  isLlmTimerRunning: boolean;
  isExecutingScript: boolean;
  handleMultiStepPhaseExecution: (phase: number) => void;
  initialInput: string;
  multiStepPhase1_Output: string;
  multiStepPhase2_Output: string;
  multiStepPhase_Timers_Running: Record<number, boolean>;
  multiStepPhase_Durations: Record<number, number | null>;
  multiStepPhase1_Input: string;
  setMultiStepPhase1_Input: (value: string) => void;
  multiStepPhase2_Input: string;
  setMultiStepPhase2_Input: (value: string) => void;
  multiStepPhase3_Input: string;
  setMultiStepPhase3_Input: (value: string) => void;
  setMultiStepPhase1_Output: (value: string) => void;
  setMultiStepPhase2_Output: (value: string) => void;
  multiStepPhase3_Output: string;
  setMultiStepPhase3_Output: (value: string) => void;
}

const GenerationTab = ({
  currentActivePhase,
  isLoadingMultiStepPhase_1,
  isLoadingMultiStepPhase_2,
  isLoadingMultiStepPhase_3,
  phase1Prompt,
  setPhase1Prompt,
  phase2Prompt,
  setPhase2Prompt,
  phase3Prompt,
  setPhase3Prompt,
  isLlmTimerRunning,
  isExecutingScript,
  handleMultiStepPhaseExecution,
  initialInput,
  multiStepPhase1_Output,
  multiStepPhase2_Output,
  multiStepPhase_Timers_Running,
  multiStepPhase_Durations,
  multiStepPhase1_Input,
  setMultiStepPhase1_Input,
  multiStepPhase2_Input,
  setMultiStepPhase2_Input,
  multiStepPhase3_Input,
  setMultiStepPhase3_Input,
  setMultiStepPhase1_Output,
  setMultiStepPhase2_Output,
  multiStepPhase3_Output,
  setMultiStepPhase3_Output,
}: GenerationTabProps) => {
  const phaseData = [
    {
      phase: 1,
      title: "Blueprint Definition",
      isLoading: isLoadingMultiStepPhase_1,
      prompt: phase1Prompt,
      setPrompt: setPhase1Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !initialInput.trim() || !phase1Prompt.trim(),
      input: multiStepPhase1_Input,
      setInput: setMultiStepPhase1_Input,
      output: multiStepPhase1_Output,
      setOutput: setMultiStepPhase1_Output,
    },
    {
      phase: 2,
      title: "Architecture Elaboration",
      isLoading: isLoadingMultiStepPhase_2,
      prompt: phase2Prompt,
      setPrompt: setPhase2Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase1_Output.trim() || !phase2Prompt.trim(),
      input: multiStepPhase2_Input,
      setInput: setMultiStepPhase2_Input,
      output: multiStepPhase2_Output,
      setOutput: setMultiStepPhase2_Output,
    },
    {
      phase: 3,
      title: "Script Generation",
      isLoading: isLoadingMultiStepPhase_3,
      prompt: phase3Prompt,
      setPrompt: setPhase3Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase2_Output.trim() || !phase3Prompt.trim(),
      input: multiStepPhase3_Input,
      setInput: setMultiStepPhase3_Input,
      output: multiStepPhase3_Output,
      setOutput: setMultiStepPhase3_Output,
    }
  ];

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
        Script Generation Phases
      </h2>
      <div className="space-y-8">
        {phaseData.map((data) => (
          <PhaseComponent
            key={data.phase}
            phase={data.phase}
            title={data.title}
            currentActivePhase={currentActivePhase}
            isLoading={data.isLoading}
            prompt={data.prompt}
            setPrompt={data.setPrompt}
            isLlmTimerRunning={isLlmTimerRunning}
            isExecutingScript={isExecutingScript}
            onRunPhase={() => handleMultiStepPhaseExecution(data.phase)}
            isRunDisabled={data.isRunDisabled}
            timerRunning={multiStepPhase_Timers_Running[data.phase]}
            duration={multiStepPhase_Durations[data.phase]}
            input={data.input}
            setInput={data.setInput}
            output={data.output}
            setOutput={data.setOutput}
          />
        ))}
      </div>
    </section>
  );
};

export default GenerationTab;

