"use client";

import { ChangeEvent } from 'react';
import CopyButton from './CopyButton';
import { Model } from '../page'; // Assuming Model type is exported from page.tsx or a types file

interface ProjectSetupProps {
  initialInput: string;
  setInitialInput: (value: string) => void;
  handleSavePrompt: () => void;
  llmModel: string;
  setLlmModel: (value: string) => void;
  availableModels: Model[];
  modelsLoading: boolean;
  modelsError: string;
  isLlmTimerRunning: boolean;
  isExecutingScript: boolean;
  handleRunAllPhases: () => void;
}

const ProjectSetup = ({
  initialInput,
  setInitialInput,
  handleSavePrompt,
  llmModel,
  setLlmModel,
  availableModels,
  modelsLoading,
  modelsError,
  isLlmTimerRunning,
  isExecutingScript,
  handleRunAllPhases,
}: ProjectSetupProps) => {
  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
        Project Setup
      </h2>
      <div className="mb-6">
        <label htmlFor="initialInstruction" className="block text-lg font-medium mb-2 text-slate-700 dark:text-slate-300">
          Initial User Instruction
        </label>
        <div className="relative">
          <textarea
            id="initialInstruction"
            name="initialInstruction"
            rows={5}
            className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500 text-base resize-y"
            placeholder="Describe the CrewAI project you want to generate (e.g., 'A crew to write a blog post about AI in healthcare')..."
            value={initialInput}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInitialInput(e.target.value)}
            disabled={isLlmTimerRunning || isExecutingScript}
          ></textarea>
          <div className="absolute top-3 right-3 flex space-x-2">
            <button
              onClick={handleSavePrompt}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition duration-150 ease-in-out text-sm font-medium disabled:opacity-50"
              disabled={isLlmTimerRunning || isExecutingScript}
            >
              Save
            </button>
            <CopyButton textToCopy={initialInput} />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="llmModelSelect" className="block text-lg font-medium mb-2 text-slate-700 dark:text-slate-300">
          LLM Model Selection
        </label>
        <div className="relative">
          <select
            id="llmModelSelect"
            name="llmModelSelect"
            className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-white hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500 text-base appearance-none"
            value={llmModel}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setLlmModel(e.target.value)}
            disabled={modelsLoading || modelsError !== "" || isLlmTimerRunning || isExecutingScript}
          >
            {modelsLoading && <option value="">Loading models...</option>}
            {modelsError && <option value="">Error loading models</option>}
            {!modelsLoading && !modelsError && availableModels.length === 0 && <option value="">No models available</option>}
            {!modelsLoading && !modelsError && availableModels.map(model => (
              <option
                key={model.id}
                value={model.id}
                disabled={model.id === 'ollama/not-configured' || model.id === 'ollama/error'}
              >
                {model.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-700 dark:text-slate-300">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
        {modelsError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{modelsError}</p>}
      </div>

      <button
        type="button"
        className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-bold text-lg px-6 py-3 rounded-xl shadow-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-600 focus:ring-4 focus:ring-green-300 focus:outline-none dark:focus:ring-green-800 mt-6"
        onClick={handleRunAllPhases}
        disabled={modelsLoading || !llmModel || isLlmTimerRunning || isExecutingScript || !initialInput.trim()}
      >
        {isLlmTimerRunning ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isLlmTimerRunning ? 'Generating...' : 'Generate Full Script (All Phases)'}
          </span>
        ) : 'Generate Full Script (All Phases)'}
      </button>
    </section>
  );
};

export default ProjectSetup;