"use client";

import TextareaWithCopy from './TextAreaWithCopy';
import Timer from './Timer';

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
  error: string | null;
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
  error,
}: PhaseComponentProps) => {
  const isActive = currentActivePhase === phase;

  return (
    <div
      className={`p-6 rounded-lg transition-shadow duration-300 ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/50 shadow-2xl ring-4 ring-blue-500/50'
          : 'bg-white dark:bg-slate-800 shadow-lg'
      } border border-slate-200 dark:border-slate-700`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          <span className="text-blue-600 dark:text-blue-400">Phase {phase}:</span> {title}
        </h3>
        <div className="flex items-center space-x-4">
          {timerRunning && <Timer isRunning={timerRunning} className="text-lg font-semibold text-blue-700 dark:text-blue-300" />}
          {duration !== null && (
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Took: {duration.toFixed(2)}s
            </span>
          )}
          <button
            onClick={onRunPhase}
            disabled={isRunDisabled || isLoading}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Running...
              </div>
            ) : `Run Phase ${phase}`}
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-4 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400 shadow-md">
          <p className="font-bold text-lg mb-2">Error in Phase {phase}:</p>
          <p className="text-base">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            Input Prompt for LLM
          </label>
          <TextareaWithCopy
            value={input}
            onValueChange={setInput}
            isReadOnly={true}
            placeholder="The full input prompt for the LLM for this phase will be displayed here after running."
            className="bg-slate-50 dark:bg-slate-700/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            Output from LLM
          </label>
          <TextareaWithCopy
            value={output}
            onValueChange={setOutput}
            isReadOnly={isLoading}
            placeholder="The LLM's output for this phase will be displayed here after running."
            className="bg-slate-50 dark:bg-slate-700/50"
          />
        </div>
      </div>
    </div>
  );
};

export default PhaseComponent;
