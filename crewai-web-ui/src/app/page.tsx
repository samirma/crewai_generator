"use client";

import { useState, useEffect, useRef } from 'react';
import SavedPrompts from './components/SavedPrompts';
import Timer from './components/Timer';
import { buildPrompt } from '../utils/promptUtils';
import ProjectSetup from './components/ProjectSetup';
import GenerationTab from './components/GenerationTab';
import ExecutionTab from './components/ExecutionTab';
import type { ExecutionResult as ExecutionResultType } from './api/execute/types';
import { parseFileBlocks } from '@/utils/fileParser';
import { useGenerationApi } from '@/hooks/useGenerationApi';

export interface Model {
  id: string;
  name: string;
}

interface Prompt {
  title: string;
  prompt: string;
}

export interface PhasedOutput {
  taskName: string;
  output: string;
}

export interface GeneratedFile {
  name: string;
  content: string;
}

// New type for a single phase's state
export interface PhaseState {
  id: number;
  title: string;
  prompt: string;
  defaultPrompt: string;
  input: string;
  output: string;
  isLoading: boolean;
  duration: number | null;
  isTimerRunning: boolean;
  filePath?: string;
}


const initialPhases: PhaseState[] = [
  { id: 1, title: "Blueprint Definition", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
  { id: 2, title: "Architecture Elaboration", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
  { id: 3, title: "User Preference Generation", filePath: "knowledge/user_preference.txt", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
  { id: 4, title: "PyProject Generation", filePath: "pyproject.toml", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
  { id: 5, title: "Agents.yaml Generation", filePath: "src/crewai_generated/config/agents.yaml", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
  { id: 6, title: "Tasks.yaml Generation", filePath: "src/crewai_generated/config/tasks.yaml", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
  { id: 7, title: "Crew.py Generation", filePath: "src/crewai_generated/crew.py", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
  { id: 8, title: "Main.py Generation", filePath: "src/crewai_generated/main.py", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
  { id: 9, title: "Tools Generation", filePath: "src/crewai_generated/tools", prompt: "", defaultPrompt: "", input: "", output: "", isLoading: false, duration: null, isTimerRunning: false },
];

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
  const { generate: generateApi, isLoading: isLlmLoading } = useGenerationApi({
    onSuccess: (data) => {
      playLlmSound();
      const { phase: completedPhaseId, output, generatedScript, duration, phasedOutputs: newPhasedOutputs } = data;
      const scriptOutput = completedPhaseId === 9 ? generatedScript : output;

      setPhases(currentPhases =>
        currentPhases.map(p =>
          p.id === completedPhaseId
            ? { ...p, output: scriptOutput, duration, isLoading: false, isTimerRunning: false }
            : p
        )
      );

      if (completedPhaseId === 9) {
        if (newPhasedOutputs) {
          setPhasedOutputs(newPhasedOutputs);
        }
        const files = parseFileBlocks(scriptOutput);
        setGeneratedFiles(files);
      }
    },
    onError: (error) => {
      playErrorSound();
      setError(error);
    },
    onFinally: () => {
      setCurrentActivePhase(null);
    },
  });
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

  // Refactored State Management
  const [phases, setPhases] = useState<PhaseState[]>(initialPhases);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);


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

  // State to manage the active phase for visual highlighting
  const [currentActivePhase, setCurrentActivePhase] = useState<number | null>(null);
  // State for managing active tab
  const [activeTab, setActiveTab] = useState<'generation' | 'execution'>('generation');




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

  useEffect(() => {
    const fetchInitialPrompts = async () => {
      try {
        const responses = await Promise.all(
          promptFileNames.map(fileName => fetch(`/prompts/${fileName}`))
        );

        for (const response of responses) {
          if (!response.ok) {
            console.error(`Failed to fetch a default prompt: ${response.status} ${response.url}`);
            setError("Failed to load one or more default prompts. Please check the console.");
            return;
          }
        }

        const texts = await Promise.all(responses.map(res => res.text()));

        setPhases(prevPhases =>
          prevPhases.map((phase, index) => ({
            ...phase,
            prompt: texts[index],
            defaultPrompt: texts[index],
          }))
        );

      } catch (e) {
        console.error("Error fetching initial prompts:", e);
        setError("Error loading initial prompts. Check console.");
      }
    };
    fetchInitialPrompts();
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
    setGeneratedFiles([]);

    // Reset all phase-specific states
    setPhases(prevPhases =>
      prevPhases.map(phase => ({
        ...phase,
        input: "",
        output: "",
        isLoading: false,
        duration: null,
        isTimerRunning: false,
      }))
    );

    setCurrentActivePhase(null);
  };


  const handlePhaseExecution = async (phaseId: number) => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30);
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }

    setPhases(currentPhases =>
      currentPhases.map(p =>
        p.id >= phaseId ? { ...p, input: "", output: "", duration: null } : p
      )
    );
    if (phaseId === 1) {
      resetOutputStates();
    }

    setCurrentActivePhase(phaseId);
    let currentPhaseState = phases.find(p => p.id === phaseId)!;
    const prevPhaseState = phaseId > 1 ? phases.find(p => p.id === phaseId - 1) : null;
    const phase2State = phases.find(p => p.id === 2);

    let fullPromptValue = "";
    if (phaseId === 1) {
      fullPromptValue = buildPrompt(initialInput, currentPhaseState.prompt, null, null);
    } else if (phaseId > 2 && phase2State) {
      fullPromptValue = `${phase2State.output}\n\n${currentPhaseState.prompt}`;
    } else if (prevPhaseState) {
      fullPromptValue = `${prevPhaseState.output}\n\n${currentPhaseState.prompt}`;
    }

    setPhases(currentPhases =>
      currentPhases.map(p =>
        p.id === phaseId ? { ...p, input: fullPromptValue, isLoading: true, isTimerRunning: true } : p
      )
    );

    await generateApi({ llmModel, mode: 'advanced', fullPrompt: fullPromptValue, runPhase: phaseId, filePath: currentPhaseState.filePath });
  };

  const handleRunAllPhases = async () => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30);
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }

    resetOutputStates();
    setActiveTab('generation');

    let currentPhases = [...phases]; // Create a mutable copy

    for (const phase of phases) {
      setCurrentActivePhase(phase.id);

      const currentPhaseState = currentPhases.find(p => p.id === phase.id)!;
      const prevPhaseState = phase.id > 1 ? currentPhases.find(p => p.id === phase.id - 1) : null;
      const phase2State = currentPhases.find(p => p.id === 2);

      let fullPromptValue = "";
      if (phase.id === 1) {
        fullPromptValue = buildPrompt(initialInput, currentPhaseState.prompt, null, null);
      } else if (phase.id > 2 && phase2State) {
        // All phases after 2 use phase 2's output as the base
        fullPromptValue = `${phase2State.output}\n\n${currentPhaseState.prompt}`;
      } else if (prevPhaseState) {
        fullPromptValue = `${prevPhaseState.output}\n\n${currentPhaseState.prompt}`;
      }

      currentPhases = currentPhases.map(p =>
        p.id === phase.id ? { ...p, input: fullPromptValue, isLoading: true, isTimerRunning: true } : p
      );
      setPhases(currentPhases);

      await generateApi({ llmModel, mode: 'advanced', fullPrompt: fullPromptValue, runPhase: phase.id, filePath: currentPhaseState.filePath });
    }
  };

  const handleExecuteScript = async () => {
    setHasExecutionAttempted(true);
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
      });

      if (!response.ok) {
        let errorText = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch {
          // ignore
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
        } catch (streamReadError) {
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
        } catch (decodeError) {
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
                const taskOutputs = parsePhasedOutputsFromStdout(finalResult.mainScript.stdout);
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
                const taskOutputs = parsePhasedOutputsFromStdout(finalResult.mainScript.stdout);
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


  const phaseData = phases.map((phase, index) => {
    const prevPhase = index > 0 ? phases[index - 1] : null;
    const isRunDisabled =
      isLlmLoading ||
      isExecutingScript ||
      !phase.prompt.trim() ||
      (index === 0 && !initialInput.trim()) ||
      (index > 0 && (!prevPhase || !prevPhase.output.trim()));

    return {
      ...phase,
      isRunDisabled,
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
        <h1 className="text-4xl font-extrabold mb-10 text-center text-indigo-700 dark:text-indigo-400 drop-shadow-md">
          CrewAI Studio
        </h1>

        <ProjectSetup
          initialInput={initialInput}
          setInitialInput={setInitialInput}
          handleSavePrompt={handleSavePrompt}
          llmModel={llmModel}
          setLlmModel={setLlmModel}
          availableModels={availableModels}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          isLlmTimerRunning={isLlmLoading}
          isExecutingScript={isExecutingScript}
          handleRunAllPhases={handleRunAllPhases}
        />

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

          <div className="mt-6">
            {activeTab === 'generation' && (
              <GenerationTab
                currentActivePhase={currentActivePhase}
                isLlmTimerRunning={isLlmLoading}
                isExecutingScript={isExecutingScript}
                handleMultiStepPhaseExecution={handlePhaseExecution}
                multiStepPhase_Timers_Running={Object.fromEntries(phases.map(p => [p.id, p.isTimerRunning]))}
                multiStepPhase_Durations={Object.fromEntries(phases.map(p => [p.id, p.duration]))}
                phaseData={phaseData}
              />
            )}

            {activeTab === 'execution' && (
              <ExecutionTab
                isExecutingScript={isExecutingScript}
                generatedFiles={generatedFiles}
                isLlmTimerRunning={isLlmLoading}
                handleExecuteScript={handleExecuteScript}
                finalExecutionStatus={finalExecutionStatus}
                hasExecutionAttempted={hasExecutionAttempted}
                scriptExecutionDuration={scriptExecutionDuration}
                scriptTimerKey={scriptTimerKey}
                dockerCommandToDisplay={dockerCommandToDisplay}
                scriptLogOutput={scriptLogOutput}
                phasedOutputs={phasedOutputs}
                scriptExecutionError={scriptExecutionError}
                finalExecutionResult={finalExecutionResult}
              />
            )}
          </div>
        </div>

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
const parsePhasedOutputsFromStdout = (stdout: string): PhasedOutput[] => {
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