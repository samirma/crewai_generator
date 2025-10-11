"use client";

import { ChangeEvent } from 'react';
import CopyButton from './CopyButton';
import Timer from './Timer';

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
  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
        Script Generation Phases
      </h2>
      <div className="space-y-8">
        {[1, 2, 3].map((phase) => (
          <div
            key={phase}
            className={`p-6 rounded-xl shadow-md border-2 transition-all duration-300 ease-in-out
              ${currentActivePhase === phase
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                : 'border-slate-200 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center text-slate-700 dark:text-slate-200">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 font-bold
                ${currentActivePhase === phase ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                {phase}
              </span>
              Phase {phase}: {phase === 1 ? "Blueprint Definition" : phase === 2 ? "Architecture Elaboration" : "Script Generation"}
              {(isLoadingMultiStepPhase_1 && phase === 1) || (isLoadingMultiStepPhase_2 && phase === 2) || (isLoadingMultiStepPhase_3 && phase === 3) ? (
                <svg className="animate-spin ml-3 h-5 w-5 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
            </h3>

            <details className="mb-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
              <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex justify-between items-center">
                <span>Prompt for Phase {phase}</span>
                <CopyButton textToCopy={
                  phase === 1 ? phase1Prompt :
                  phase === 2 ? phase2Prompt :
                  phase3Prompt
                } />
              </summary>
              <textarea
                id={`phase${phase}Prompt`}
                value={
                  phase === 1 ? phase1Prompt :
                  phase === 2 ? phase2Prompt :
                  phase3Prompt
                }
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  if (phase === 1) setPhase1Prompt(e.target.value);
                  else if (phase === 2) setPhase2Prompt(e.target.value);
                  else setPhase3Prompt(e.target.value);
                }}
                rows={6}
                className="mt-2 w-full p-3 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500 text-sm resize-y"
                disabled={isLlmTimerRunning || isExecutingScript}
              />
            </details>

            <button
              onClick={() => handleMultiStepPhaseExecution(phase)}
              disabled={
                isLlmTimerRunning || isExecutingScript ||
                (phase === 1 && (!initialInput.trim() || !phase1Prompt.trim())) ||
                (phase === 2 && (!multiStepPhase1_Output.trim() || !phase2Prompt.trim())) ||
                (phase === 3 && (!multiStepPhase2_Output.trim() || !phase3Prompt.trim()))
              }
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2.5 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-purple-400 focus:outline-none dark:focus:ring-purple-700 flex items-center justify-center gap-2"
            >
              {(isLoadingMultiStepPhase_1 && phase === 1) || (isLoadingMultiStepPhase_2 && phase === 2) || (isLoadingMultiStepPhase_3 && phase === 3) ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              Run Phase {phase} Only
            </button>

            {multiStepPhase_Timers_Running[phase] && (
              <div className="mt-4 p-3 border border-purple-300 dark:border-purple-700 rounded-md bg-purple-50 dark:bg-purple-900/30 shadow-sm text-center">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Phase {phase} Timer: <Timer isRunning={multiStepPhase_Timers_Running[phase]} className="inline font-semibold" />
                </p>
              </div>
            )}
            {multiStepPhase_Durations[phase] !== null && !multiStepPhase_Timers_Running[phase] && (
              <div className="mt-4 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Phase {phase} took: <span className="font-semibold">{multiStepPhase_Durations[phase]?.toFixed(2)} seconds</span>
                </p>
              </div>
            )}

            <details className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
              <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex justify-between items-center">
                <span>Input for Phase {phase}</span>
                <CopyButton textToCopy={
                  phase === 1 ? multiStepPhase1_Input :
                  phase === 2 ? multiStepPhase2_Input :
                  multiStepPhase3_Input
                } />
              </summary>
              <textarea
                value={(phase === 1 ? multiStepPhase1_Input : phase === 2 ? multiStepPhase2_Input : multiStepPhase3_Input) || "Input will appear here after running the phase."}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  if (phase === 1) setMultiStepPhase1_Input(e.target.value);
                  else if (phase === 2) setMultiStepPhase2_Input(e.target.value);
                  else setMultiStepPhase3_Input(e.target.value);
                }}
                className="mt-2 w-full p-3 border border-slate-300 rounded-md bg-slate-100 shadow-inner overflow-auto whitespace-pre-wrap min-h-[160px] text-xs dark:bg-slate-900 dark:border-slate-600 dark:text-slate-400 resize-y"
              />
            </details>

            <details className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
              <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex justify-between items-center">
                <span>Output of Phase {phase}</span>
                <CopyButton textToCopy={
                  phase === 1 ? multiStepPhase1_Output :
                  phase === 2 ? multiStepPhase2_Output :
                  multiStepPhase3_Output
                } />
              </summary>
              <textarea
                value={(phase === 1 ? multiStepPhase1_Output : phase === 2 ? multiStepPhase2_Output : multiStepPhase3_Output) || "Output will appear here after running the."}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  if (phase === 1) setMultiStepPhase1_Output(e.target.value);
                  else if (phase === 2) setMultiStepPhase2_Output(e.target.value);
                  else setMultiStepPhase3_Output(e.target.value);
                }}
                className="mt-2 w-full p-3 border border-slate-300 rounded-md bg-slate-100 shadow-inner overflow-auto whitespace-pre-wrap min-h-[160px] text-xs dark:bg-slate-900 dark:border-slate-600 dark:text-slate-400 resize-y"
              />
            </details>
          </div>
        ))}
      </div>
    </section>
  );
};

export default GenerationTab;