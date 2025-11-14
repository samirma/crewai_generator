"use client";

import { ChangeEvent } from 'react';
import CopyButton from '@/app/components/CopyButton';
import Timer from '@/app/components/Timer';

interface PhaseComponentProps {
  phase: number;
  title: string;
  currentActivePhase: number | null;
  isLoading: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  isLlmTimerRunning: boolean;
  isExecutingScript: boolean;
  onRunPhase: () => void;
  isRunDisabled: boolean;
  timerRunning: boolean;
  duration: number | null;
  input: string;
  setInput: (value: string) => void;
  output: string;
  setOutput: (value: string) => void;
}

const PhaseComponent = ({
  phase,
  title,
  currentActivePhase,
  isLoading,
  prompt,
  setPrompt,
  isLlmTimerRunning,
  isExecutingScript,
  onRunPhase,
  isRunDisabled,
  timerRunning,
  duration,
  input,
  setInput,
  output,
  setOutput,
}: PhaseComponentProps) => {
  return (
    <div
      data-testid={`phase-component-${phase}`}
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
        Phase {phase}: {title}
        {isLoading && (
          <svg className="animate-spin ml-3 h-5 w-5 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </h3>

      <details className="mb-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
        <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex justify-between items-center">
          <span>Prompt for Phase {phase}</span>
          <CopyButton textToCopy={prompt} />
        </summary>
        <textarea
          id={`phase${phase}Prompt`}
          value={prompt}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
          rows={6}
          className="mt-2 w-full p-3 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500 text-sm resize-y"
          disabled={isLlmTimerRunning || isExecutingScript}
        />
      </details>

      <button
        onClick={onRunPhase}
        disabled={isRunDisabled}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2.5 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-purple-400 focus:outline-none dark:focus:ring-purple-700 flex items-center justify-center gap-2"
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        Run Phase {phase} Only
      </button>

      {(timerRunning || duration) && (
        <div
          className={`mt-4 p-3 border rounded-md shadow-sm text-center ${
            timerRunning
              ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30'
              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700'
          }`}
        >
          <p
            className={`text-sm ${
              timerRunning
                ? 'text-purple-700 dark:text-purple-300'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Phase {phase} Timer:{' '}
            <Timer
              isRunning={timerRunning}
              duration={duration}
              className="inline font-semibold"
            />
          </p>
        </div>
      )}

      <details className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
        <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex justify-between items-center">
          <span>Input for Phase {phase}</span>
          <CopyButton textToCopy={input} />
        </summary>
        <textarea
          value={input || "Input will appear here after running the phase."}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          className="mt-2 w-full p-3 border border-slate-300 rounded-md bg-slate-100 shadow-inner overflow-auto whitespace-pre-wrap min-h-[160px] text-xs dark:bg-slate-900 dark:border-slate-600 dark:text-slate-400 resize-y"
        />
      </details>

      <details className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
        <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex justify-between items-center">
          <span>Output of Phase {phase}</span>
          <CopyButton textToCopy={output} />
        </summary>
        <textarea
          value={output || "Output will appear here after running the."}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setOutput(e.target.value)}
          className="mt-2 w-full p-3 border border-slate-300 rounded-md bg-slate-100 shadow-inner overflow-auto whitespace-pre-wrap min-h-[160px] text-xs dark:bg-slate-900 dark:border-slate-600 dark:text-slate-400 resize-y"
        />
      </details>
    </div>
  );
};

export default PhaseComponent;

