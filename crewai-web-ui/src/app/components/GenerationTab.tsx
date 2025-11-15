"use client";

import PhaseComponent from '@/app/components/PhaseComponent';
import { PhaseStatus } from '@/config/phases.config';

interface PhaseData {
  id: number;
  title: string;
  status: PhaseStatus;
  prompt: string;
  setPrompt: (value: string) => void;
  isRunDisabled: boolean;
  input: string;
  setInput: (value: string) => void;
  output: string;
  setOutput: (value: string) => void;
}

interface GenerationTabProps {
  isExecutingScript: boolean;
  handleMultiStepPhaseExecution: (phase: number) => void;
  multiStepPhase_Durations: Record<number, number | null>;
  phaseData: PhaseData[];
}

const GenerationTab = ({
  isExecutingScript,
  handleMultiStepPhaseExecution,
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
            status={data.status}
            prompt={data.prompt}
            setPrompt={data.setPrompt}
            isExecutingScript={isExecutingScript}
            onRunPhase={() => handleMultiStepPhaseExecution(data.id)}
            isRunDisabled={data.isRunDisabled}
            duration={multiStepPhase_Durations[data.id]}
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
