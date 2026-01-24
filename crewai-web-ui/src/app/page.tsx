"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SavedPrompts from './components/SavedPrompts';
import Timer from './components/Timer';
import ProjectSetup from './components/ProjectSetup';
import GenerationTab from './components/GenerationTab';
import ExecutionTab from './components/ExecutionTab';
import { useGenerationApi } from '@/hooks/useGenerationApi';
import { usePhases } from '@/hooks/usePhases';
import PhaseSummary from './components/PhaseSummary';
import { usePrompts } from '@/hooks/usePrompts';
import { useModels } from '@/hooks/useModels';
import { useExecution } from '@/hooks/useExecution';
import { setCookie, getCookie } from '@/utils/cookieUtils';
import ServerIpSettings from '@/app/components/ServerIpSettings';


export default function Home() {
  const { generate: generateApi } = useGenerationApi();
  const [initialInput, setInitialInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [llmRequestDuration, setLlmRequestDuration] = useState<number | null>(null);
  const llmRequestFinishSoundRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState<'generation' | 'execution'>('generation');
  const [runScriptAfterGeneration, setRunScriptAfterGeneration] = useState<boolean>(false);
  const [isLlmLoading, setIsLlmLoading] = useState<boolean>(false);
  const [runDuration, setRunDuration] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [activeExecutionMode, setActiveExecutionMode] = useState<'sequential' | 'parallel' | null>(null);

  const { savedPrompts, handleSavePrompt, handleDeletePrompt } = usePrompts();
  const { availableModels, modelsLoading, modelsError, llmModel, setLlmModel } = useModels();
  const {
    isExecutingScript,
    isExecutingStreamlit,
    scriptExecutionError,
    scriptLogOutput,
    dockerCommandToDisplay,
    phasedOutputs,
    scriptExecutionDuration,
    hasExecutionAttempted,
    scriptTimerKey,
    executionStartTime,
    finalExecutionStatus,
    finalExecutionResult,
    handleExecuteScript,
    handleExecuteStreamlit,
    stopExecution
  } = useExecution();

  const playLlmSound = () => {
    llmRequestFinishSoundRef.current?.play().catch(e => console.error("Error playing LLM sound:", e));
  };

  const {
    phases,
    setPhases,
    handlePhaseExecution,
    handleRunAllPhases,
    handleRunAllPhasesInParallel,
    isRunAllLoading,
    error: phasesError,
  } = usePhases(initialInput, llmModel, playLlmSound, generateApi);

  useEffect(() => {
    llmRequestFinishSoundRef.current = new Audio('/sounds/llm_finish.mp3');
    const initialInstructionCookie = getCookie('initialInstruction');
    if (initialInstructionCookie) {
      setInitialInput(initialInstructionCookie);
    }
    const llmModelCookie = getCookie('llmModelSelection');
    if (llmModelCookie) {
      setLlmModel(llmModelCookie);
    }
  }, []);

  const resetOutputStates = () => {
    setError("");
    setLlmRequestDuration(null);
    setPhases(prevPhases =>
      prevPhases.map(phase => ({
        ...phase,
        input: "",
        output: "",
        status: 'pending',
        duration: null,
      }))
    );
  };

  const handleRunScript = async (isParallel: boolean) => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30);
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    resetOutputStates();
    setActiveTab('generation');
    setIsTimerRunning(true);
    setRunDuration(null);
    setActiveExecutionMode(isParallel ? 'parallel' : 'sequential');

    const startTime = Date.now();
    const executePhases = isParallel ? handleRunAllPhasesInParallel : handleRunAllPhases;
    const success = await executePhases();
    const endTime = Date.now();

    setRunDuration((endTime - startTime) / 1000);
    setIsTimerRunning(false);
    setActiveExecutionMode(null);

    if (success && runScriptAfterGeneration) {
      handleExecuteScript();
      setActiveTab('execution');
    }
  };

  const phaseData = phases.map((phase, index) => {
    return {
      ...phase,
      setPrompt: (value: string) => {
        setPhases(currentPhases =>
          currentPhases.map(p => (p.id === phase.id ? { ...p, prompt: value } : p))
        );
      },
      setInput: (value: string) => {
        setPhases(currentPhases =>
          currentPhases.map(p => (p.id === phase.id ? { ...p, input: value } : p))
        );
      },
      setOutput: (value: string) => {
        setPhases(currentPhases =>
          currentPhases.map(p => (p.id === phase.id ? { ...p, output: value } : p))
        );
      },
    };
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-inter">
      <SavedPrompts prompts={savedPrompts} onSelectPrompt={setInitialInput} onDeletePrompt={handleDeletePrompt} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <h1 className="text-4xl font-extrabold mb-10 text-center text-indigo-700 dark:text-indigo-400 drop-shadow-md flex flex-col gap-2 relative">
          <span>CrewAI Studio</span>
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 absolute right-0 top-1/2 -translate-y-1/2">
            Go to Dashboard &rarr;
          </Link>
        </h1>

        <div className="mb-8">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              className={`flex-1 py-3 px-4 text-center font-semibold text-lg transition-colors duration-200
                ${activeTab === 'generation' ? 'text-indigo-700 border-b-2 border-indigo-700 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              onClick={() => setActiveTab('generation')}
            >
              Script Generation
            </button>
            <button
              className={`flex-1 py-3 px-4 text-center font-semibold text-lg transition-colors duration-200
                ${activeTab === 'execution' ? 'text-indigo-700 border-b-2 border-indigo-700 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              onClick={() => setActiveTab('execution')}
            >
              Script Execution
            </button>
          </div>
        </div>

        {activeTab === 'generation' && (
          <>
            <ServerIpSettings />
            <ProjectSetup
              initialInput={initialInput}
              setInitialInput={setInitialInput}
              handleSavePrompt={() => handleSavePrompt(initialInput)}
              llmModel={llmModel}
              setLlmModel={setLlmModel}
              availableModels={availableModels}
              modelsLoading={modelsLoading}
              modelsError={modelsError}
              isLlmTimerRunning={isLlmLoading}
              isExecutingScript={isExecutingScript}
              handleRunAllPhases={handleRunScript}
              isRunAllLoading={isRunAllLoading}
              runScriptAfterGeneration={runScriptAfterGeneration}
              setRunScriptAfterGeneration={setRunScriptAfterGeneration}
              runDuration={runDuration}
              isTimerRunning={isTimerRunning}
              activeExecutionMode={activeExecutionMode}
            />
            {(error || phasesError) && (
              <div className="mt-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400 shadow-md">
                <p className="font-bold text-lg mb-2">Error:</p>
                <p className="text-base">{error || phasesError}</p>
              </div>
            )}
            {isRunAllLoading && (
              <div className="my-8">
                <PhaseSummary phases={phases} />
              </div>
            )}
            {(isLlmLoading || llmRequestDuration !== null) && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700 text-center">
                {isLlmLoading ? (
                  <p className="text-lg text-blue-700 dark:text-blue-300 font-medium">
                    LLM Request Timer: <Timer isRunning={isLlmLoading} className="inline font-bold text-xl" />
                  </p>
                ) : (
                  llmRequestDuration !== null && (
                    <p className="text-lg text-slate-700 dark:text-slate-300 font-medium">
                      Last LLM request took: <span className="font-bold text-xl">{llmRequestDuration.toFixed(2)}</span> seconds
                    </p>
                  )
                )}
              </div>
            )}

            <div className="mt-6">
              <GenerationTab
                isExecutingScript={isExecutingScript}
                handleMultiStepPhaseExecution={handlePhaseExecution}
                multiStepPhase_Durations={Object.fromEntries(phases.map(p => [p.id, p.duration]))}
                phaseData={phaseData}
              />
            </div>
          </>
        )}

        {activeTab === 'execution' && (
          <div className="mt-6">
            <ExecutionTab
              isExecutingScript={isExecutingScript}
              isExecutingStreamlit={isExecutingStreamlit}
              isLlmTimerRunning={isLlmLoading}
              handleExecuteScript={handleExecuteScript}
              handleExecuteStreamlit={handleExecuteStreamlit}
              stopExecution={stopExecution}
              finalExecutionStatus={finalExecutionStatus}
              hasExecutionAttempted={hasExecutionAttempted}
              scriptExecutionDuration={scriptExecutionDuration}
              scriptTimerKey={scriptTimerKey}
              executionStartTime={executionStartTime}
              dockerCommandToDisplay={dockerCommandToDisplay}
              scriptLogOutput={scriptLogOutput}
              phasedOutputs={phasedOutputs}
              scriptExecutionError={scriptExecutionError}
              finalExecutionResult={finalExecutionResult}
            />
          </div>
        )}
      </main>
    </div>
  );
}
