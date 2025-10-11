"use client";

import PhaseComponent from '@/app/components/PhaseComponent';

interface GenerationTabProps {
  currentActivePhase: number | null;
  isLoadingMultiStepPhase_1: boolean;
  isLoadingMultiStepPhase_2: boolean;
  isLoadingMultiStepPhase_3: boolean;
  isLoadingMultiStepPhase_4: boolean;
  isLoadingMultiStepPhase_5: boolean;
  isLoadingMultiStepPhase_6: boolean;
  isLoadingMultiStepPhase_7: boolean;
  isLoadingMultiStepPhase_8: boolean;
  isLoadingMultiStepPhase_9: boolean;
  phase1Prompt: string;
  setPhase1Prompt: (value: string) => void;
  phase2Prompt: string;
  setPhase2Prompt: (value: string) => void;
  phase3Prompt: string;
  setPhase3Prompt: (value: string) => void;
  phase4Prompt: string;
  setPhase4Prompt: (value: string) => void;
  phase5Prompt: string;
  setPhase5Prompt: (value: string) => void;
  phase6Prompt: string;
  setPhase6Prompt: (value: string) => void;
  phase7Prompt: string;
  setPhase7Prompt: (value: string) => void;
  phase8Prompt: string;
  setPhase8Prompt: (value: string) => void;
  phase9Prompt: string;
  setPhase9Prompt: (value: string) => void;
  isLlmTimerRunning: boolean;
  isExecutingScript: boolean;
  handleMultiStepPhaseExecution: (phase: number) => void;
  initialInput: string;
  multiStepPhase1_Output: string;
  multiStepPhase2_Output: string;
  multiStepPhase3_Output: string;
  multiStepPhase4_Output: string;
  multiStepPhase5_Output: string;
  multiStepPhase6_Output: string;
  multiStepPhase7_Output: string;
  multiStepPhase8_Output: string;
  multiStepPhase9_Output: string;
  multiStepPhase_Timers_Running: Record<number, boolean>;
  multiStepPhase_Durations: Record<number, number | null>;
  multiStepPhase1_Input: string;
  setMultiStepPhase1_Input: (value: string) => void;
  multiStepPhase2_Input: string;
  setMultiStepPhase2_Input: (value: string) => void;
  multiStepPhase3_Input: string;
  setMultiStepPhase3_Input: (value: string) => void;
  multiStepPhase4_Input: string;
  setMultiStepPhase4_Input: (value: string) => void;
  multiStepPhase5_Input: string;
  setMultiStepPhase5_Input: (value: string) => void;
  multiStepPhase6_Input: string;
  setMultiStepPhase6_Input: (value: string) => void;
  multiStepPhase7_Input: string;
  setMultiStepPhase7_Input: (value: string) => void;
  multiStepPhase8_Input: string;
  setMultiStepPhase8_Input: (value: string) => void;
  multiStepPhase9_Input: string;
  setMultiStepPhase9_Input: (value: string) => void;
  setMultiStepPhase1_Output: (value: string) => void;
  setMultiStepPhase2_Output: (value: string) => void;
  setMultiStepPhase3_Output: (value: string) => void;
  setMultiStepPhase4_Output: (value: string) => void;
  setMultiStepPhase5_Output: (value: string) => void;
  setMultiStepPhase6_Output: (value: string) => void;
  setMultiStepPhase7_Output: (value: string) => void;
  setMultiStepPhase8_Output: (value: string) => void;
  setMultiStepPhase9_Output: (value: string) => void;
}

const GenerationTab = ({
  currentActivePhase,
  isLoadingMultiStepPhase_1,
  isLoadingMultiStepPhase_2,
  isLoadingMultiStepPhase_3,
  isLoadingMultiStepPhase_4,
  isLoadingMultiStepPhase_5,
  isLoadingMultiStepPhase_6,
  isLoadingMultiStepPhase_7,
  isLoadingMultiStepPhase_8,
  isLoadingMultiStepPhase_9,
  phase1Prompt,
  setPhase1Prompt,
  phase2Prompt,
  setPhase2Prompt,
  phase3Prompt,
  setPhase3Prompt,
  phase4Prompt,
  setPhase4Prompt,
  phase5Prompt,
  setPhase5Prompt,
  phase6Prompt,
  setPhase6Prompt,
  phase7Prompt,
  setPhase7Prompt,
  phase8Prompt,
  setPhase8Prompt,
  phase9Prompt,
  setPhase9Prompt,
  isLlmTimerRunning,
  isExecutingScript,
  handleMultiStepPhaseExecution,
  initialInput,
  multiStepPhase1_Output,
  multiStepPhase2_Output,
  multiStepPhase3_Output,
  multiStepPhase4_Output,
  multiStepPhase5_Output,
  multiStepPhase6_Output,
  multiStepPhase7_Output,
  multiStepPhase8_Output,
  multiStepPhase9_Output,
  multiStepPhase_Timers_Running,
  multiStepPhase_Durations,
  multiStepPhase1_Input,
  setMultiStepPhase1_Input,
  multiStepPhase2_Input,
  setMultiStepPhase2_Input,
  multiStepPhase3_Input,
  setMultiStepPhase3_Input,
  multiStepPhase4_Input,
  setMultiStepPhase4_Input,
  multiStepPhase5_Input,
  setMultiStepPhase5_Input,
  multiStepPhase6_Input,
  setMultiStepPhase6_Input,
  multiStepPhase7_Input,
  setMultiStepPhase7_Input,
  multiStepPhase8_Input,
  setMultiStepPhase8_Input,
  multiStepPhase9_Input,
  setMultiStepPhase9_Input,
  setMultiStepPhase1_Output,
  setMultiStepPhase2_Output,
  setMultiStepPhase3_Output,
  setMultiStepPhase4_Output,
  setMultiStepPhase5_Output,
  setMultiStepPhase6_Output,
  setMultiStepPhase7_Output,
  setMultiStepPhase8_Output,
  setMultiStepPhase9_Output,
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
      title: "User Preference Generation",
      isLoading: isLoadingMultiStepPhase_3,
      prompt: phase3Prompt,
      setPrompt: setPhase3Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase2_Output.trim() || !phase3Prompt.trim(),
      input: multiStepPhase3_Input,
      setInput: setMultiStepPhase3_Input,
      output: multiStepPhase3_Output,
      setOutput: setMultiStepPhase3_Output,
    },
    {
      phase: 4,
      title: "PyProject Generation",
      isLoading: isLoadingMultiStepPhase_4,
      prompt: phase4Prompt,
      setPrompt: setPhase4Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase3_Output.trim() || !phase4Prompt.trim(),
      input: multiStepPhase4_Input,
      setInput: setMultiStepPhase4_Input,
      output: multiStepPhase4_Output,
      setOutput: setMultiStepPhase4_Output,
    },
    {
      phase: 5,
      title: "Agents.yaml Generation",
      isLoading: isLoadingMultiStepPhase_5,
      prompt: phase5Prompt,
      setPrompt: setPhase5Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase4_Output.trim() || !phase5Prompt.trim(),
      input: multiStepPhase5_Input,
      setInput: setMultiStepPhase5_Input,
      output: multiStepPhase5_Output,
      setOutput: setMultiStepPhase5_Output,
    },
    {
      phase: 6,
      title: "Tasks.yaml Generation",
      isLoading: isLoadingMultiStepPhase_6,
      prompt: phase6Prompt,
      setPrompt: setPhase6Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase5_Output.trim() || !phase6Prompt.trim(),
      input: multiStepPhase6_Input,
      setInput: setMultiStepPhase6_Input,
      output: multiStepPhase6_Output,
      setOutput: setMultiStepPhase6_Output,
    },
    {
      phase: 7,
      title: "Crew.py Generation",
      isLoading: isLoadingMultiStepPhase_7,
      prompt: phase7Prompt,
      setPrompt: setPhase7Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase6_Output.trim() || !phase7Prompt.trim(),
      input: multiStepPhase7_Input,
      setInput: setMultiStepPhase7_Input,
      output: multiStepPhase7_Output,
      setOutput: setMultiStepPhase7_Output,
    },
    {
      phase: 8,
      title: "Main.py Generation",
      isLoading: isLoadingMultiStepPhase_8,
      prompt: phase8Prompt,
      setPrompt: setPhase8Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase7_Output.trim() || !phase8Prompt.trim(),
      input: multiStepPhase8_Input,
      setInput: setMultiStepPhase8_Input,
      output: multiStepPhase8_Output,
      setOutput: setMultiStepPhase8_Output,
    },
    {
      phase: 9,
      title: "Tools Generation",
      isLoading: isLoadingMultiStepPhase_9,
      prompt: phase9Prompt,
      setPrompt: setPhase9Prompt,
      isRunDisabled: isLlmTimerRunning || isExecutingScript || !multiStepPhase8_Output.trim() || !phase9Prompt.trim(),
      input: multiStepPhase9_Input,
      setInput: setMultiStepPhase9_Input,
      output: multiStepPhase9_Output,
      setOutput: setMultiStepPhase9_Output,
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

