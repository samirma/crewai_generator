"use client";

import { useState, useEffect, useRef } from 'react';
import SavedPrompts from './components/SavedPrompts';
import CopyButton from './components/CopyButton';
import Timer from './components/Timer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { buildPrompt } from '../utils/promptUtils';
import type { ExecutionResult as ExecutionResultType } from './api/execute/types';

interface Model {
  id: string;
  name: string;
}

interface Prompt {
  title: string;
  prompt: string;
}

interface PhasedOutput {
  taskName: string;
  output: string;
}

const phases = [
  { id: 'blueprint', title: 'Blueprint Definition', outputState: 'blueprint', dependentStates: [] },
  { id: 'agents_yaml', title: 'Agents.yaml', outputState: 'agentsYaml', dependentStates: ['blueprint'] },
  { id: 'tasks_yaml', title: 'Tasks.yaml', outputState: 'tasksYaml', dependentStates: ['blueprint', 'agentsYaml'] },
  { id: 'crew_py', title: 'Crew.py', outputState: 'crewPy', dependentStates: ['blueprint', 'agentsYaml', 'tasksYaml'] },
  { id: 'main_py', title: 'Main.py', outputState: 'mainPy', dependentStates: ['blueprint', 'crewPy'] },
];

function setCookie(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (encodeURIComponent(value) || "") + expires + "; path=/";
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

export default function Home() {
  const [initialInput, setInitialInput] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("");
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
  const [isExecutingScript, setIsExecutingScript] = useState<boolean>(false);
  const [scriptExecutionError, setScriptExecutionError] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [modelsError, setModelsError] = useState<string>("");
  const [phasedOutputs, setPhasedOutputs] = useState<PhasedOutput[]>([]);
  const [scriptLogOutput, setScriptLogOutput] = useState<string[]>([]);
  const [dockerCommandToDisplay, setDockerCommandToDisplay] = useState<string>("");

  const [generationOutputs, setGenerationOutputs] = useState({
    blueprint: "",
    agentsYaml: "",
    tasksYaml: "",
    crewPy: "",
    mainPy: "",
  });

  const [isLoading, setIsLoading] = useState({
    blueprint: false,
    agents_yaml: false,
    tasks_yaml: false,
    crew_py: false,
    main_py: false,
  });

  const [llmRequestDuration, setLlmRequestDuration] = useState<number | null>(null);
  const [scriptExecutionDuration, setScriptExecutionDuration] = useState<number | null>(null);
  const [hasExecutionAttempted, setHasExecutionAttempted] = useState<boolean>(false);
  const [scriptTimerKey, setScriptTimerKey] = useState<number>(0);

  const [finalExecutionStatus, setFinalExecutionStatus] = useState<string | null>(null);
  const [finalExecutionResult, setFinalExecutionResult] = useState<ExecutionResultType | null>(null);

  const llmRequestFinishSoundRef = useRef<HTMLAudioElement | null>(null);
  const scriptSuccessSoundRef = useRef<HTMLAudioElement | null>(null);
  const scriptErrorSoundRef = useRef<HTMLAudioElement | null>(null);

  const [activeTab, setActiveTab] = useState<'generation' | 'execution'>('generation');

  const isLlmTimerRunning = Object.values(isLoading).some(v => v);

  const fetchSavedPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      const prompts: Prompt[] = await response.json();
      setSavedPrompts(prompts);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSavedPrompts();
    llmRequestFinishSoundRef.current = new Audio('/sounds/llm_finish.mp3');
    scriptSuccessSoundRef.current = new Audio('/sounds/script_success.mp3');
    scriptErrorSoundRef.current = new Audio('/sounds/script_error.mp3');

    const initialInstructionCookie = getCookie('initialInstruction');
    if (initialInstructionCookie) {
      setInitialInput(initialInstructionCookie);
    }

    const llmModelCookie = getCookie('llmModelSelection');
    if (llmModelCookie) {
      setLlmModel(llmModelCookie);
    }
  }, []);

  const handleSavePrompt = async () => {
    const title = window.prompt("Enter a title for the prompt:");
    if (title) {
      try {
        const response = await fetch('/api/prompts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, prompt: initialInput }),
        });
        if (!response.ok) {
          throw new Error('Failed to save prompt');
        }
        fetchSavedPrompts();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleDeletePrompt = async (title: string) => {
    if (window.confirm(`Are you sure you want to delete the prompt "${title}"?`)) {
      try {
        const response = await fetch('/api/prompts', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        });
        if (!response.ok) {
          throw new Error('Failed to delete prompt');
        }
        fetchSavedPrompts();
      } catch (error) {
        console.error(error);
      }
    }
  };

  useEffect(() => {
    const fetchModels = async () => {
      setModelsLoading(true);
      setModelsError("");
      try {
        const response = await fetch('/api/models');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch models: ${response.status}`);
        }
        const models: Model[] = await response.json();
        setAvailableModels(models);
        if (models.length > 0) {
          const selectableModels = models.filter(model => model.id !== 'ollama/not-configured' && model.id !== 'ollama/error');
          if (selectableModels.length > 0) {
            const newGeminiModel = selectableModels.find(model => model.id === "gemini-2.5-flash-preview-05-20");
            const llmModelCookie = getCookie('llmModelSelection');
            if (llmModelCookie && selectableModels.some(model => model.id === llmModelCookie)) {
              setLlmModel(llmModelCookie);
            } else if (newGeminiModel) {
              setLlmModel(newGeminiModel.id);
            } else {
              setLlmModel(selectableModels[0].id);
            }
          } else {
            setLlmModel("");
          }
        } else {
          setLlmModel("");
        }
      } catch (err) {
        console.error("Error fetching models:", err);
        if (err instanceof Error) {
          setModelsError(err.message);
        } else {
          setModelsError("An unknown error occurred while fetching models.");
        }
      } finally {
        setModelsLoading(false);
      }
    };
    fetchModels();
  }, []);

  const playLlmSound = () => {
    llmRequestFinishSoundRef.current?.play().catch(e => console.error("Error playing LLM sound:", e));
  };

  const playSuccessSound = () => {
    scriptSuccessSoundRef.current?.play().catch(e => console.error("Error playing success sound:", e));
  };

  const playErrorSound = () => {
    scriptErrorSoundRef.current?.play().catch(e => console.error("Error playing error sound:", e));
  };

  const resetOutputStates = () => {
    setError("");
    setPhasedOutputs([]);
    setScriptExecutionError("");
    setModelsError("");
    setLlmRequestDuration(null);
    setScriptExecutionDuration(null);
    setFinalExecutionStatus(null);
    setFinalExecutionResult(null);
    setDockerCommandToDisplay("");
    setScriptLogOutput([]);
    setGenerationOutputs({ blueprint: "", agentsYaml: "", tasksYaml: "", crewPy: "", mainPy: "" });
  };

  const handleGenerate = async (phase: string) => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30);

    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }

    setError("");
    setIsLoading(prev => ({ ...prev, [phase]: true }));

    const payload: any = {
      llmModel,
      phase,
      initialInput,
      blueprint: generationOutputs.blueprint,
      agents_yaml: generationOutputs.agentsYaml,
      tasks_yaml: generationOutputs.tasksYaml,
      crew_py: generationOutputs.crewPy,
    };

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setLlmRequestDuration(data.duration);

      const phaseConfig = phases.find(p => p.id === phase);
      if (phaseConfig) {
        setGenerationOutputs(prev => ({ ...prev, [phaseConfig.outputState]: data.output }));
      }

      playLlmSound();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      playErrorSound();
    } finally {
      setIsLoading(prev => ({ ...prev, [phase]: false }));
    }
  };

  const handleExecuteScript = async () => {
    setHasExecutionAttempted(true);
    if (!generationOutputs.mainPy) {
      setScriptExecutionError("No script to execute.");
      return;
    }
    setIsExecutingScript(true);
    setScriptTimerKey(prevKey => prevKey + 1);
    setScriptExecutionError("");
    setScriptLogOutput([]);
    setDockerCommandToDisplay("");
    setPhasedOutputs([]);
    setScriptExecutionDuration(null);
    setFinalExecutionStatus(null);
    setFinalExecutionResult(null);
    setActiveTab('execution');

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agents_yaml: generationOutputs.agentsYaml,
          tasks_yaml: generationOutputs.tasksYaml,
          crew_py: generationOutputs.crewPy,
          main_py: generationOutputs.mainPy,
        }),
      });

      if (!response.ok) {
        let errorText = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch (e) {
        }
        playErrorSound();
        throw new Error(errorText);
      }

      if (!response.body) {
        playErrorSound();
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("DOCKER_COMMAND: ")) {
            setDockerCommandToDisplay(line.substring("DOCKER_COMMAND: ".length));
          } else if (line.startsWith("LOG: ")) {
            setScriptLogOutput(prev => [...prev, line.substring("LOG: ".length)]);
          } else if (line.startsWith("RESULT: ")) {
            try {
              const finalResult: ExecutionResultType = JSON.parse(line.substring("RESULT: ".length));
              setFinalExecutionResult(finalResult);
              setFinalExecutionStatus(finalResult.overallStatus);
              setScriptExecutionDuration(finalResult.scriptExecutionDuration ?? null);
              if (finalResult.mainScript && finalResult.mainScript.stdout) {
                const taskOutputs = parsePhasedOutputs(finalResult.mainScript.stdout);
                setPhasedOutputs(taskOutputs);
              }
              if (finalResult.overallStatus === 'failure') {
                let errorMsg = "Script execution failed.";
                if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                setScriptExecutionError(errorMsg);
                playErrorSound();
              } else if (finalResult.overallStatus === 'success') {
                playSuccessSound();
              }
            } catch (e) {
              setScriptExecutionError("Error parsing final result from script execution.");
              playErrorSound();
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setScriptExecutionError(err.message);
      } else {
        setScriptExecutionError("An unknown error occurred.");
      }
      playErrorSound();
    } finally {
      setIsExecutingScript(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-inter">
      {/* Saved Prompts Sidebar */}
      <SavedPrompts prompts={savedPrompts} onSelectPrompt={setInitialInput} onDeletePrompt={handleDeletePrompt} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <h1 className="text-4xl font-extrabold mb-10 text-center text-indigo-700 dark:text-indigo-400 drop-shadow-md">
          CrewAI Studio
        </h1>

        {/* Global Input & Model Selection */}
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
                onChange={(e) => setInitialInput(e.target.value)}
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
                onChange={(e) => setLlmModel(e.target.value)}
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
            onClick={() => phases.forEach(p => handleGenerate(p.id))}
            disabled={modelsLoading || !llmModel || isLlmTimerRunning || isExecutingScript || !initialInput.trim()}
          >
            {isLlmTimerRunning ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : 'Generate All'}
          </button>
        </section>

        {(isLlmTimerRunning || llmRequestDuration !== null) && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700 text-center">
            {isLlmTimerRunning ? (
              <p className="text-lg text-blue-700 dark:text-blue-300 font-medium">
                LLM Request Timer: <Timer isRunning={isLlmTimerRunning} className="inline font-bold text-xl" />
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

        <div className="mb-8">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              className={`flex-1 py-3 px-4 text-center font-semibold text-lg transition-colors duration-200
                ${activeTab === 'generation' ? 'text-indigo-700 border-b-2 border-indigo-700 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              onClick={() => setActiveTab('generation')}
            >
              File Generation
            </button>
            <button
              className={`flex-1 py-3 px-4 text-center font-semibold text-lg transition-colors duration-200
                ${activeTab === 'execution' ? 'text-indigo-700 border-b-2 border-indigo-700 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              onClick={() => setActiveTab('execution')}
            >
              Execution
            </button>
          </div>

          <div className="mt-6">
            {activeTab === 'generation' && (
              <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
                  File Generation
                </h2>
                <div className="space-y-8">
                  {phases.map(phase => (
                    <div key={phase.id} className="p-6 rounded-xl shadow-md border-2 border-slate-200 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700">
                      <h3 className="text-xl font-semibold mb-4 flex items-center text-slate-700 dark:text-slate-200">
                        {phase.title}
                        {isLoading[phase.id as keyof typeof isLoading] && (
                          <svg className="animate-spin ml-3 h-5 w-5 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </h3>
                      <button
                        onClick={() => handleGenerate(phase.id)}
                        disabled={isLlmTimerRunning || isExecutingScript || phase.dependentStates.some(s => !generationOutputs[s as keyof typeof generationOutputs])}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2.5 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-purple-400 focus:outline-none dark:focus:ring-purple-700 flex items-center justify-center gap-2"
                      >
                        Generate {phase.title}
                      </button>
                      <textarea
                        value={generationOutputs[phase.outputState as keyof typeof generationOutputs] || `Output for ${phase.title} will appear here.`}
                        readOnly
                        className="mt-4 w-full p-3 border border-slate-300 rounded-md bg-slate-100 shadow-inner overflow-auto whitespace-pre-wrap min-h-[160px] text-xs dark:bg-slate-900 dark:border-slate-600 dark:text-slate-400 resize-y"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'execution' && (
              <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
                  Execution
                </h2>
                <button
                  type="button"
                  onClick={handleExecuteScript}
                  disabled={isExecutingScript || isLlmTimerRunning || !generationOutputs.mainPy}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-6 py-3 rounded-xl shadow-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:bg-gray-400 focus:ring-4 focus:ring-indigo-300 focus:outline-none dark:focus:ring-indigo-800 flex items-center justify-center gap-2 mb-6"
                >
                  {isExecutingScript ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Executing Script...
                    </span>
                  ) : 'Run The Crew'}
                </button>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <details className="border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm mb-4" open>
                      <summary className="flex justify-between items-center p-4 cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-t-xl">
                        <span className="text-lg font-medium text-slate-700 dark:text-slate-300">
                          Generated main.py
                        </span>
                        <CopyButton textToCopy={generationOutputs.mainPy} />
                      </summary>
                      <div className="w-full p-4 bg-slate-900 overflow-auto min-h-[200px] max-h-[500px] rounded-b-xl">
                        <SyntaxHighlighter
                          language="python"
                          style={atomDark}
                          showLineNumbers={true}
                          wrapLines={true}
                          lineProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }}
                          customStyle={{ margin: 0, backgroundColor: 'transparent', height: 'auto', overflow: 'auto' }}
                          codeTagProps={{ style: { fontFamily: 'inherit' } }}
                        >
                          {generationOutputs.mainPy || "# main.py will appear here after generation."}
                        </SyntaxHighlighter>
                      </div>
                    </details>
                  </div>
                  <div>
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 shadow-sm min-h-[300px] flex flex-col">
                      <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">
                        Execution Output & Logs
                      </h3>

                      {/* Overall Execution Status */}
                      {finalExecutionStatus && (
                        <div className={`mb-4 p-3 rounded-md text-center font-semibold text-lg
                          ${finalExecutionStatus === 'success' ? 'bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                          Status: {finalExecutionStatus.charAt(0).toUpperCase() + finalExecutionStatus.slice(1)}
                        </div>
                      )}

                      {/* Script Execution Timer & Duration */}
                      {(isExecutingScript || (hasExecutionAttempted && scriptExecutionDuration !== null)) && (
                        <div className="mb-4 p-3 border border-green-300 dark:border-green-700 rounded-md bg-green-50 dark:bg-green-900/30 shadow-sm text-center">
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Execution Timer: <Timer key={scriptTimerKey} isRunning={isExecutingScript} className="inline font-semibold" />
                          </p>
                        </div>
                      )}
                      {scriptExecutionDuration !== null && !isExecutingScript && (
                        <div className="mb-4 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm text-center">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Execution took: <span className="font-semibold">{scriptExecutionDuration.toFixed(2)}</span> seconds
                          </p>
                        </div >
                      )}

                      {/* Docker Command */}
                      {dockerCommandToDisplay && (
                        <details className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
                          <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex justify-between items-center">
                            <span>Docker Command Used</span>
                            <CopyButton textToCopy={dockerCommandToDisplay} />
                          </summary>
                          <pre className="mt-2 p-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-[150px]">
                            {dockerCommandToDisplay}
                          </pre>
                        </details>
                      )}

                      {/* Live Logs */}
                      <div className="flex-1 flex flex-col mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">
                            {isExecutingScript ? "Execution Logs (Streaming...)" : "Execution Logs:"}
                          </h4>
                          <CopyButton textToCopy={scriptLogOutput.join('\n')} />
                        </div>
                        {(scriptLogOutput.length > 0 || isExecutingScript) ? (
                          <pre className="flex-1 p-3 border border-slate-300 rounded-md bg-slate-100 shadow-inner overflow-auto whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300 dark:bg-slate-900 dark:border-slate-600">
                            {scriptLogOutput.length > 0 ? scriptLogOutput.join('\n') : "Waiting for script output..."}
                          </pre>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">No logs produced yet.</p>
                        )}
                      </div>

                      {/* Phased Outputs */}
                      {phasedOutputs.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2">Task Outputs:</h4>
                          <ul className="space-y-3">
                            {phasedOutputs.map((out, index) => (
                              <li key={index} className="p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm relative">
                                <div className="flex justify-between items-start">
                                  <strong className="text-sm text-indigo-600 dark:text-indigo-400 pr-2">{out.taskName}:</strong>
                                  <div className="absolute top-2 right-2">
                                    <CopyButton textToCopy={out.output} />
                                  </div>
                                </div>
                                <pre className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-[100px]">{out.output}</pre>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {scriptExecutionError && !finalExecutionStatus && (
                        <div className="mt-4 p-3 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
                          <p className="font-semibold">Execution Error:</p>
                          <p>{scriptExecutionError}</p>
                        </div>
                      )}

                      {finalExecutionStatus && finalExecutionResult && (
                        <details className="mt-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
                          <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                            View Raw Execution Result JSON
                          </summary>
                          <pre className="mt-2 p-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-[300px]">
                            {JSON.stringify(finalExecutionResult, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Error Display (kept outside tabs for global visibility) */}
        {error && (
          <div className="mt-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400 shadow-md">
            <p className="font-bold text-lg mb-2">Error:</p>
            <p className="text-base">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}

const parsePhasedOutputs = (stdout: string): PhasedOutput[] => {
  const outputs: PhasedOutput[] = [];
  const lines = stdout.split('\n');
  let currentTaskName = "Unknown Task";
  let currentOutput = "";

  for (const line of lines) {
    const taskOutputMatch = line.match(/^(?:\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}\])?.*?\[(\w+Agent)\] - (.*?) - Task Output: (.*)/i);
    const genericTaskOutputMatch = line.match(/^(?:\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}\])?.*?Task Output: (.*)/i);

    if (taskOutputMatch) {
      if (currentOutput.trim()) {
        outputs.push({ taskName: currentTaskName, output: currentOutput.trim() });
      }
      currentTaskName = taskOutputMatch[1] ? `${taskOutputMatch[1]} - ${taskOutputMatch[2]}` : taskOutputMatch[2];
      currentOutput = taskOutputMatch[3];
    } else if (genericTaskOutputMatch) {
      if (currentOutput.trim()) {
        outputs.push({ taskName: currentTaskName, output: currentOutput.trim() });
      }
      currentTaskName = "Unnamed Task";
      currentOutput = genericTaskOutputMatch[1];
    }
    else {
      currentOutput += `\n${line}`;
    }
  }
  if (currentOutput.trim()) {
    outputs.push({ taskName: currentTaskName, output: currentOutput.trim() });
  }
  return outputs;
};
