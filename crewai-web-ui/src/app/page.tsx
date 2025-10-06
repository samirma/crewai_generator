"use client"; // Required for Next.js App Router to use client-side features like useState

import { useState, useEffect, useRef } from 'react';
import SavedPrompts from './components/SavedPrompts';
import CopyButton from './components/CopyButton';
import Timer from './components/Timer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { buildPrompt } from '../utils/promptUtils';

// Attempt to import ExecutionResult type for better type safety
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

const DEFAULT_PHASE1_PROMPT_FILENAME = "phase1_blueprint_prompt.md";
const DEFAULT_PHASE2_PROMPT_FILENAME = "phase2_architecture_prompt.md";
const DEFAULT_PHASE3_PROMPT_FILENAME = "phase3_script_prompt.md";

// Helper function to set a cookie
function setCookie(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (encodeURIComponent(value) || "") + expires + "; path=/";
}

// Helper function to get a cookie
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
  const [phasedOutputs, setPhasedOutputs] = useState<PhasedOutput[]>([]); // For simple mode's task outputs
  const [scriptLogOutput, setScriptLogOutput] = useState<string[]>([]);
  const [dockerCommandToDisplay, setDockerCommandToDisplay] = useState<string>("");

  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string | null>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [llmRequestDuration, setLlmRequestDuration] = useState<number | null>(null);
  const [scriptExecutionDuration, setScriptExecutionDuration] = useState<number | null>(null);
  const [hasExecutionAttempted, setHasExecutionAttempted] = useState<boolean>(false);
  const [scriptTimerKey, setScriptTimerKey] = useState<number>(0);

  // State for detailed execution status
  const [finalExecutionStatus, setFinalExecutionStatus] = useState<string | null>(null);
  const [finalExecutionResult, setFinalExecutionResult] = useState<ExecutionResultType | null>(null);

  // Sound effects
  const llmRequestFinishSoundRef = useRef<HTMLAudioElement | null>(null);
  const scriptSuccessSoundRef = useRef<HTMLAudioElement | null>(null);
  const scriptErrorSoundRef = useRef<HTMLAudioElement | null>(null);

  // State for managing active tab
  const [activeTab, setActiveTab] = useState<'generation' | 'execution'>('generation');

  const isLlmTimerRunning = isLoading;

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
    // Initialize Audio objects - only on client side
    llmRequestFinishSoundRef.current = new Audio('/sounds/llm_finish.mp3');
    scriptSuccessSoundRef.current = new Audio('/sounds/script_success.mp3');
    scriptErrorSoundRef.current = new Audio('/sounds/script_error.mp3');

    // Load initialInput from cookie on component mount using helper
    const initialInstructionCookie = getCookie('initialInstruction');
    if (initialInstructionCookie) {
      setInitialInput(initialInstructionCookie);
    }

    // Load llmModelSelection from cookie
    const llmModelCookie = getCookie('llmModelSelection');
    if (llmModelCookie) {
      setLlmModel(llmModelCookie);
    }
  }, []); // Empty dependency array ensures this runs only on mount

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
            // Prioritize the new Gemini model, then the first selectable model
            const newGeminiModel = selectableModels.find(model => model.id === "gemini-2.5-flash-preview-05-20");
            const llmModelCookie = getCookie('llmModelSelection'); // Get cookie value here

            if (llmModelCookie && selectableModels.some(model => model.id === llmModelCookie)) {
              setLlmModel(llmModelCookie); // Use cookie value if available and valid
            } else if (newGeminiModel) {
              setLlmModel(newGeminiModel.id); // Fallback to Gemini if cookie is not set or invalid
            } else {
              setLlmModel(selectableModels[0].id); // Fallback to the first selectable model
            }
          } else {
            setLlmModel(""); // No selectable models available
          }
        } else {
          setLlmModel(""); // No models available at all
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

  // The useEffect for fetching initial prompts is no longer needed as the backend handles the prompts.

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
    setGeneratedFiles({});
    setActiveFile(null);
  };

  const handleGenerateFullScript = async () => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30);
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    resetOutputStates();
    setIsLoading(true);
    setActiveTab('generation');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmModel,
          initialInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate script.");
      }

      const data = await response.json();
      setGeneratedFiles(data.files);
      setLlmRequestDuration(data.duration);
      // Set the first available file as active
      const firstFile = Object.keys(data.files).find(key => data.files[key]);
      if (firstFile) {
        setActiveFile(firstFile);
      }
      playLlmSound();

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during script generation.");
      }
      playErrorSound();
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteScript = async () => {
    setHasExecutionAttempted(true);
    if (Object.keys(generatedFiles).length === 0) {
      setScriptExecutionError("No script generated to execute.");
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
    setActiveTab('execution'); // Ensure execution tab is active when running script

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // The new backend doesn't need the script; it knows where to find it.
        body: JSON.stringify({}),
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
        let value;
        let done;
        try {
          ({ value, done } = await reader.read());
        } catch (streamReadError: any) {
          console.error("Error reading from stream:", streamReadError);
          setScriptExecutionError("Error reading script output stream. Connection may have been lost or the process terminated unexpectedly.");
          setScriptLogOutput(prev => [...prev, "STREAM_ERROR: The log stream ended unexpectedly due to a read error."]);
          break;
        }

        if (done) {
          break;
        }

        try {
          buffer += decoder.decode(value, { stream: true });
        } catch (decodeError: any) {
          console.error("Error decoding stream data:", decodeError);
          setScriptExecutionError("Error decoding script output. The data may be corrupted.");
          setScriptLogOutput(prev => [...prev, "STREAM_ERROR: The log stream contained undecodable data."]);
          break;
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("DOCKER_COMMAND: ")) {
            setDockerCommandToDisplay(line.substring("DOCKER_COMMAND: ".length));
          } else if (line.startsWith("PRE_DOCKER_LOG: ")) {
            setScriptLogOutput(prev => [...prev, "PRE_DOCKER_RUN: " + line.substring("PRE_DOCKER_LOG: ".length)]);
          } else if (line.startsWith("PRE_DOCKER_ERROR: ")) {
            setScriptLogOutput(prev => [...prev, "PRE_DOCKER_RUN_ERROR: " + line.substring("PRE_DOCKER_ERROR: ".length)]);
          } else if (line.startsWith("LOG: ")) {
            setScriptLogOutput(prev => [...prev, line.substring("LOG: ".length)]);
          } else if (line.startsWith("LOG_ERROR: ")) {
            setScriptLogOutput(prev => [...prev, line.substring("LOG_ERROR: ".length)]);
          } else if (line.startsWith("RESULT: ")) {
            try {
              const finalResult: ExecutionResultType = JSON.parse(line.substring("RESULT: ".length));
              setFinalExecutionResult(finalResult);
              setFinalExecutionStatus(finalResult.overallStatus);

              if (finalResult.scriptExecutionDuration !== undefined) {
                setScriptExecutionDuration(finalResult.scriptExecutionDuration);
              } else {
                setScriptExecutionDuration(null);
              }

              if (finalResult.mainScript && finalResult.mainScript.stdout) {
                const taskOutputs = parsePhasedOutputs(finalResult.mainScript.stdout);
                setPhasedOutputs(taskOutputs);
              }

              if (finalResult.overallStatus === 'failure') {
                let errorMsg = "Script execution failed.";
                if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
                setScriptExecutionError(errorMsg);
                playErrorSound();
              } else if (finalResult.overallStatus === 'success') {
                playSuccessSound();
              }
            } catch (e) {
              console.error("Error parsing final result JSON:", e);
              setScriptExecutionError("Error parsing final result from script execution.");
              setFinalExecutionStatus('failure');
              setFinalExecutionResult(null);
              setScriptExecutionDuration(null);
              playErrorSound();
            }
          }
        }
      }
      if (buffer.startsWith("DOCKER_COMMAND: ")) {
        setDockerCommandToDisplay(buffer.substring("DOCKER_COMMAND: ".length));
      } else if (buffer.startsWith("PRE_DOCKER_LOG: ")) {
        setScriptLogOutput(prev => [...prev, "PRE_DOCKER_RUN: " + buffer.substring("PRE_DOCKER_LOG: ".length)]);
      } else if (buffer.startsWith("PRE_DOCKER_ERROR: ")) {
        setScriptLogOutput(prev => [...prev, "PRE_DOCKER_RUN_ERROR: " + buffer.substring("PRE_DOCKER_ERROR: ".length)]);
      } else if (buffer.startsWith("LOG: ")) {
        setScriptLogOutput(prev => [...prev, buffer.substring("LOG: ".length)]);
      } else if (buffer.startsWith("LOG_ERROR: ")) {
        setScriptLogOutput(prev => [...prev, buffer.substring("LOG_ERROR: ".length)]);
      } else if (buffer.startsWith("RESULT: ")) {
         try {
              const finalResult: ExecutionResultType = JSON.parse(buffer.substring("RESULT: ".length));
              setFinalExecutionResult(finalResult);
              setFinalExecutionStatus(finalResult.overallStatus);

              if (finalResult.scriptExecutionDuration !== undefined) {
                setScriptExecutionDuration(finalResult.scriptExecutionDuration);
              } else {
                setScriptExecutionDuration(null);
              }

              if (finalResult.mainScript && finalResult.mainScript.stdout) {
                const taskOutputs = parsePhasedOutputs(finalResult.mainScript.stdout);
                setPhasedOutputs(taskOutputs);
              }

              if (finalResult.overallStatus === 'failure') {
                let errorMsg = "Script execution failed.";
                if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
                setScriptExecutionError(errorMsg);
                playErrorSound();
              } else if (finalResult.overallStatus === 'success') {
                playSuccessSound();
              }
            } catch (e) {
              console.error("Error parsing final result JSON from remaining buffer:", e);
              setScriptExecutionError("Error parsing final result from script execution (buffer).");
              setFinalExecutionStatus('failure');
              setFinalExecutionResult(null);
              setScriptExecutionDuration(null);
              playErrorSound();
            }
      }

    } catch (err) {
      console.error("Error executing script:", err);
      if (err instanceof Error) {
        setScriptExecutionError(err.message);
      } else {
        setScriptExecutionError("An unknown error occurred while executing the script.");
      }
      playErrorSound();
    } finally {
      setIsExecutingScript(false);
    }
  };

  const executeGenerateRequest = async (
    url: string,
    payload: object,
    onSuccess: (data: any) => void,
    onError: (errorMessage: string) => void,
    onFinally?: () => void
  ) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      const data = await response.json();
      if (data.duration !== undefined) {
        setLlmRequestDuration(data.duration);
      } else {
        setLlmRequestDuration(null);
      }
      onSuccess(data);
    } catch (err) {
      console.error("API Request Error:", err);
      onError(err instanceof Error ? err.message : "An unknown API error occurred.");
      playErrorSound();
    } finally {
      playLlmSound();
      if (onFinally) {
        onFinally();
      }
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
            onClick={handleGenerateFullScript}
            disabled={modelsLoading || !llmModel || isLoading || isExecutingScript || !initialInput.trim()}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Project...
              </span>
            ) : 'Generate Full Script'}
          </button>
        </section>

        {/* LLM Request Timer & Duration */}
        {(isLlmTimerRunning || llmRequestDuration !== null) && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700 text-center">
            {isLlmTimerRunning ? (
              <p className="text-lg text-blue-700 dark:text-blue-300 font-medium">
                LLM Request Timer: <Timer isRunning={isLlmTimerRunning} className="inline font-bold text-xl" />
              </p>
            ) : (
              llmRequestDuration !== null && (
                <p className="text-lg text-slate-700 dark:text-slate-300 font-medium">
                  Generation took: <span className="font-bold text-xl">{llmRequestDuration.toFixed(2)}</span> seconds
                </p>
              )
            )}
          </div>
        )}

        {/* Tabbed Interface */}
        <div className="mb-8">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              className={`flex-1 py-3 px-4 text-center font-semibold text-lg transition-colors duration-200
                ${activeTab === 'generation' ? 'text-indigo-700 border-b-2 border-indigo-700 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              onClick={() => setActiveTab('generation')}
            >
              Generated Files
            </button>
            <button
              className={`flex-1 py-3 px-4 text-center font-semibold text-lg transition-colors duration-200
                ${activeTab === 'execution' ? 'text-indigo-700 border-b-2 border-indigo-700 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              onClick={() => setActiveTab('execution')}
            >
              Script Execution
            </button>
          </div>

          <div className="mt-6">
            {/* Script Generation Tab Content */}
            {activeTab === 'generation' && (
              <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
                  Generated Project Files
                </h2>
                {Object.keys(generatedFiles).length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                    <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                      {Object.keys(generatedFiles).filter(file => generatedFiles[file]).map(file => (
                        <button
                          key={file}
                          onClick={() => setActiveFile(file)}
                          className={`px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap
                            ${activeFile === file
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                            }`}
                        >
                          {file}
                        </button>
                      ))}
                    </div>
                    {activeFile && generatedFiles[activeFile] && (
                       <div className="w-full bg-slate-900 overflow-auto min-h-[200px] max-h-[600px] rounded-b-xl relative">
                        <div className="absolute top-2 right-4 z-10">
                          <CopyButton textToCopy={generatedFiles[activeFile]!} />
                        </div>
                        <SyntaxHighlighter
                          language={activeFile.endsWith('.py') ? 'python' : 'yaml'}
                          style={atomDark}
                          showLineNumbers={true}
                          wrapLines={true}
                          lineProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }}
                          customStyle={{ margin: 0, padding: "1.5rem 1rem", backgroundColor: 'transparent', height: 'auto', overflow: 'auto' }}
                          codeTagProps={{ style: { fontFamily: 'inherit' } }}
                        >
                          {generatedFiles[activeFile]!}
                        </SyntaxHighlighter>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-slate-500 dark:text-slate-400">
                      {isLoading ? 'Generating project files...' : 'Click "Generate Full Script" to create the `crewai` project files.'}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Script Execution Tab Content */}
            {activeTab === 'execution' && (
              <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
                  Script Execution
                </h2>

                <button
                  type="button"
                  onClick={handleExecuteScript}
                  disabled={
                    isExecutingScript ||
                    Object.keys(generatedFiles).length === 0 ||
                    isLoading
                  }
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
                  ) : 'Run This Script'}
                </button>

                <div className="grid md:grid-cols-1 gap-6">
                  {/* Script Execution Output */}
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

// Helper function to parse phased outputs from script stdout
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
