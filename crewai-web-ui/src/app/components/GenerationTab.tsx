"use client";

import PhaseComponent from '@/app/components/PhaseComponent';

interface PhaseData {
  id: number;
  title: string;
  isLoading: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  isRunDisabled: boolean;
  input: string;
  setInput: (value: string) => void;
  output: string;
  setOutput: (value: string) => void;
  error: string | null;
}

interface GenerationTabProps {
  currentActivePhase: number | null;
  isLlmTimerRunning: boolean;
  isExecutingScript: boolean;
  handleMultiStepPhaseExecution: (phase: number) => void;
  multiStepPhase_Timers_Running: Record<number, boolean>;
  multiStepPhase_Durations: Record<number, number | null>;
  phaseData: PhaseData[];
}

const GenerationTab = ({
  currentActivePhase,
  isLlmTimerRunning,
  isExecutingScript,
  handleMultiStepPhaseExecution,
  multiStepPhase_Timers_Running,
  multiStepPhase_Durations,
  phaseData,
}: GenerationTabProps) => {
  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
        Script Generation Phases
      </h2>
      <div className="space-y-8">
        {phaseData.map((data) => (
          <PhaseComponent
            key={data.id}
            phase={data.id}
            title={data.title}
            currentActivePhase={currentActivePhase}
            isLoading={data.isLoading}
            prompt={data.prompt}
            setPrompt={data.setPrompt}
            isLlmTimerRunning={isLlmTimerRunning}
            isExecutingScript={isExecutingScript}
            onRunPhase={() => handleMultiStepPhaseExecution(data.id)}
            isRunDisabled={data.isRunDisabled}
            timerRunning={multiStepPhase_Timers_Running[data.id]}
            duration={multiStepPhase_Durations[data.id]}
            input={data.input}
            setInput={data.setInput}
            output={data.output}
            setOutput={data.setOutput}
            error={data.error}
          />
        ))}
      </div>
    </section>
  );
};

export default GenerationTab;
