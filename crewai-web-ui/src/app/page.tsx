"use client"; // Required for Next.js App Router to use client-side features like useState

import { useState, useEffect, useRef } from 'react';
import SavedPrompts from './components/SavedPrompts';
import CopyButton from './components/CopyButton';
import Timer from './components/Timer'; // <-- Add this line
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { buildPrompt } from '../utils/promptUtils';

// Attempt to import ExecutionResult type for better type safety
// If this path is incorrect, we might need to adjust or use 'any'
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
  const [activeTab, setActiveTab] = useState<string>("setup");
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

  // Advanced Mode State
  const [phase1Prompt, setPhase1Prompt] = useState<string>("");
  const [phase2Prompt, setPhase2Prompt] = useState<string>("");
  const [phase3Prompt, setPhase3Prompt] = useState<string>("");
  const [actualLlmInputPrompt, setActualLlmInputPrompt] = useState<string>("");
  const [actualLlmOutputPrompt, setActualLlmOutputPrompt] = useState<string>("");
  const [llmRequestDuration, setLlmRequestDuration] = useState<number | null>(null);
  const [scriptExecutionDuration, setScriptExecutionDuration] = useState<number | null>(null);
  const [hasExecutionAttempted, setHasExecutionAttempted] = useState<boolean>(false);
  const [scriptTimerKey, setScriptTimerKey] = useState<number>(0);
  const [defaultPhase1PromptText, setDefaultPhase1PromptText] = useState<string>("");
  const [defaultPhase2PromptText, setDefaultPhase2PromptText] = useState<string>("");
  const [defaultPhase3PromptText, setDefaultPhase3PromptText] = useState<string>("");

  // State for detailed execution status
  const [finalExecutionStatus, setFinalExecutionStatus] = useState<string | null>(null);
  const [finalExecutionResult, setFinalExecutionResult] = useState<ExecutionResultType | null>(null);

  // Sound effects
  const llmRequestFinishSoundRef = useRef<HTMLAudioElement | null>(null);
  const scriptSuccessSoundRef = useRef<HTMLAudioElement | null>(null);
  const scriptErrorSoundRef = useRef<HTMLAudioElement | null>(null);

  // State for Multi-Step Mode
  const [multiStepPhase1_Input, setMultiStepPhase1_Input] = useState<string>("");
  const [multiStepPhase1_Output, setMultiStepPhase1_Output] = useState<string>("");
  const [multiStepPhase2_Input, setMultiStepPhase2_Input] = useState<string>("");
  const [multiStepPhase2_Output, setMultiStepPhase2_Output] = useState<string>("");
  const [multiStepPhase3_Input, setMultiStepPhase3_Input] = useState<string>("");
  const [multiStepPhase3_Output, setMultiStepPhase3_Output] = useState<string>("");
  const [isLoadingMultiStepPhase_1, setIsLoadingMultiStepPhase_1] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_2, setIsLoadingMultiStepPhase_2] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_3, setIsLoadingMultiStepPhase_3] = useState<boolean>(false);
  const [multiStepPhase_Durations, setMultiStepPhase_Durations] = useState<Record<number, number | null>>({ 1: null, 2: null, 3: null });
  const [multiStepPhase_Timers_Running, setMultiStepPhase_Timers_Running] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });
  const [isRecreatingDockerImage, setIsRecreatingDockerImage] = useState<boolean>(false);
  const [isInterrupting, setIsInterrupting] = useState<boolean>(false);

  const isLlmTimerRunning = isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3;

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

  const handleInterruptScript = async () => {
    setIsInterrupting(true);
    setError("");
    try {
      const response = await fetch('/api/execute/interrupt', {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to interrupt script');
      }
      alert('Script interrupted successfully!');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while interrupting the script.');
      }
    } finally {
      setIsInterrupting(false);
    }
  };

  const handleRecreateDockerImage = async () => {
    setIsRecreatingDockerImage(true);
    setError("");
    try {
      const response = await fetch('/api/docker/recreate', {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recreate Docker image');
      }
      alert('Docker image recreated successfully!');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while recreating the Docker image.');
      }
    } finally {
      setIsRecreatingDockerImage(false);
    }
  };

  useEffect(() => {
    fetchSavedPrompts();
    // Initialize Audio objects - only on client side
    // IMPORTANT: Replace with actual paths to your sound files in the public directory
    llmRequestFinishSoundRef.current = new Audio('/sounds/llm_finish.mp3'); // Placeholder
    scriptSuccessSoundRef.current = new Audio('/sounds/script_success.mp3'); // Placeholder
    scriptErrorSoundRef.current = new Audio('/sounds/script_error.mp3'); // Placeholder

    // Optional: Preload sounds for faster playback, though this might not be necessary for small files
    // llmRequestFinishSoundRef.current.load();
    // scriptSuccessSoundRef.current.load();
    // scriptErrorSoundRef.current.load();

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
    const title = prompt("Enter a title for the prompt:");
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
    if (confirm(`Are you sure you want to delete the prompt "${title}"?`)) {
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
          // Filter out non-selectable models before determining the default
          const selectableModels = models.filter(model => model.id !== 'ollama/not-configured' && model.id !== 'ollama/error');

          if (selectableModels.length > 0) {
            // Prioritize the new Gemini model, then the first selectable model
            const newGeminiModel = selectableModels.find(model => model.id === "gemini-2.5-flash-preview-05-20");
            if (newGeminiModel) {
              setLlmModel(newGeminiModel.id);
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

  // Fetch initial prompts for advanced mode
  useEffect(() => {
    const fetchInitialPrompts = async () => {
      try {
        const r1 = await fetch('/prompts/phase1_blueprint_prompt.md');
        const r2 = await fetch('/prompts/phase2_architecture_prompt.md');
        const r3 = await fetch('/prompts/phase3_script_prompt.md');

        if (!r1.ok || !r2.ok || !r3.ok) {
          console.error("Failed to fetch one or more default prompts.");
          setError("Failed to load default prompts for Advanced Mode. You may need to copy them manually if running locally. Check console for details.");
          // Attempt to read anyway, to see which one failed.
          if (!r1.ok) console.error(`Phase 1 prompt fetch failed: ${r1.status}`);
          if (!r2.ok) console.error(`Phase 2 prompt fetch failed: ${r2.status}`);
          if (!r3.ok) console.error(`Phase 3 prompt fetch failed: ${r3.status}`);
          return; // Exit if any prompt fails to load
        }

        const p1Text = await r1.text();
        const p2Text = await r2.text();
        const p3Text = await r3.text();

        setPhase1Prompt(p1Text);
        setDefaultPhase1PromptText(p1Text);
        setPhase2Prompt(p2Text);
        setDefaultPhase2PromptText(p2Text);
        setPhase3Prompt(p3Text);
        setDefaultPhase3PromptText(p3Text);
      } catch (e) {
        console.error("Error fetching initial prompts:", e);
        setError("Error loading initial prompts. Check console.");
      }
    };
    fetchInitialPrompts();
  }, []);

  // Sound playing helper functions
  const playLlmSound = () => {
    console.log("Playing LLM request finish sound (placeholder)");
    llmRequestFinishSoundRef.current?.play().catch(e => console.error("Error playing LLM sound:", e));
  };

  const playSuccessSound = () => {
    console.log("Playing script success sound (placeholder)");
    scriptSuccessSoundRef.current?.play().catch(e => console.error("Error playing success sound:", e));
  };

  const playErrorSound = () => {
    console.log("Playing script error sound (placeholder)");
    scriptErrorSoundRef.current?.play().catch(e => console.error("Error playing error sound:", e));
  };

  const resetOutputStates = () => {
    setError("");
    setPhasedOutputs([]);
    setScriptExecutionError("");
    setModelsError("");
    setActualLlmInputPrompt("");
    setActualLlmOutputPrompt("");
    setLlmRequestDuration(null);
    setScriptExecutionDuration(null);
    setFinalExecutionStatus(null); // Reset detailed status
    setFinalExecutionResult(null); // Reset detailed result object

    // Clear multi-step states
    setMultiStepPhase1_Input("");
    setMultiStepPhase1_Output("");
    setMultiStepPhase2_Input("");
    setMultiStepPhase2_Output("");
    setMultiStepPhase3_Input("");
    setMultiStepPhase3_Output("");
    setIsLoadingMultiStepPhase_1(false);
    setIsLoadingMultiStepPhase_2(false);
    setIsLoadingMultiStepPhase_3(false);
    setMultiStepPhase_Durations({ 1: null, 2: null, 3: null });
    setMultiStepPhase_Timers_Running({ 1: false, 2: false, 3: false });
  };

  const handleMultiStepPhaseExecution = async (phase: number) => {
    setCookie('initialInstruction', initialInput, 30); // Persist initial input
    setCookie('llmModelSelection', llmModel, 30); // Persist LLM model selection
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }

    // Reset general error/prompt displays for a fresh call information
    setError("");
    setScriptExecutionError("");
    setActualLlmInputPrompt(""); // Cleared before new API call info is shown
    setActualLlmOutputPrompt(""); // Cleared before new API call info is shown

    // Set loading states for the current phase
    if (phase === 1) setIsLoadingMultiStepPhase_1(true);
    else if (phase === 2) setIsLoadingMultiStepPhase_2(true);
    else if (phase === 3) setIsLoadingMultiStepPhase_3(true);

    setMultiStepPhase_Timers_Running(prev => ({ ...prev, [phase]: true }));
    setMultiStepPhase_Durations(prev => ({ ...prev, [phase]: null })); // Reset duration for current phase

    // Clear input/outputs of current and subsequent phases to ensure fresh data
    if (phase === 1) {
      setMultiStepPhase1_Input(""); setMultiStepPhase1_Output("");
      setMultiStepPhase2_Input(""); setMultiStepPhase2_Output(""); // Clear phase 2 input/output
      setMultiStepPhase3_Input(""); setMultiStepPhase3_Output(""); // Clear phase 3 input/output
    } else if (phase === 2) {
      setMultiStepPhase2_Input(""); setMultiStepPhase2_Output("");
      setMultiStepPhase3_Input(""); setMultiStepPhase3_Output(""); // Clear phase 3 input/output
    } else if (phase === 3) {
      setMultiStepPhase3_Input(""); setMultiStepPhase3_Output("");
    }

    let fullPromptValue = "";
    try {
      // Prompt construction and input state update
      if (phase === 1) {
        if (!initialInput.trim() || !phase1Prompt.trim()) {
          setError("Initial input and Phase 1 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 1.");
        }
        fullPromptValue = buildPrompt(initialInput, phase1Prompt, null, null);
        setMultiStepPhase1_Input(fullPromptValue);
      } else if (phase === 2) {
        if (!multiStepPhase1_Output.trim()) {
          setError("Phase 1 output is missing. Cannot run Phase 2.");
          throw new Error("Missing Phase 1 output for Phase 2.");
        }
        if (!phase2Prompt.trim()) {
          setError("Phase 2 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 2.");
        }
        fullPromptValue = multiStepPhase1_Output + "\n\n" + phase2Prompt;
        setMultiStepPhase2_Input(fullPromptValue);
      } else if (phase === 3) {
        if (!multiStepPhase2_Output.trim()) {
          setError("Phase 2 output is missing. Cannot run Phase 3.");
          throw new Error("Missing Phase 2 output for Phase 3.");
        }
        if (!phase3Prompt.trim()) {
          setError("Phase 3 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 3.");
        }
        fullPromptValue = multiStepPhase2_Output + "\n\n" + phase3Prompt;
        setMultiStepPhase3_Input(fullPromptValue);
      } else {
        setError("Invalid phase number provided.");
        throw new Error("Invalid phase number.");
      }

      const payload = {
        llmModel,
        mode: 'advanced', // Multi-step uses 'advanced' API mode with phase distinction
        fullPrompt: fullPromptValue,
        runPhase: phase, // This tells the backend which phase logic to mimic if needed
      };

      await executeGenerateRequest(
        '/api/generate',
        payload,
        (data) => { // onSuccess callback
          setMultiStepPhase_Durations(prev => ({ ...prev, [phase]: data.duration !== undefined ? data.duration : null }));

          if (phase === 1) {
            setMultiStepPhase1_Output(data.output || "");
          } else if (phase === 2) {
            setMultiStepPhase2_Output(data.output || "");
          } else if (phase === 3) {
            setMultiStepPhase3_Output(data.generatedScript || "");
            // Also set generatedScript for compatibility with existing script execution UI
            if (data.phasedOutputs) { // In case phase 3 also returns phased outputs
              setPhasedOutputs(data.phasedOutputs);
            }
          }
        },
        (errorMessage) => { // onError callback
          setError(errorMessage);
          // Note: executeGenerateRequest already handles its own internal 'finally' for loading states,
          // but we have phase-specific ones here.
        }
      );

    } catch (err) {
      if (err instanceof Error && !error) { // Set error only if not already set by deeper calls
        setError(err.message);
      }
      // Ensure loading state is reset for current phase if error occurs before/during API call setup
      // This is a safeguard. executeGenerateRequest's finally should handle it if the call was made.
      if (phase === 1) setIsLoadingMultiStepPhase_1(false);
      else if (phase === 2) setIsLoadingMultiStepPhase_2(false);
      else if (phase === 3) setIsLoadingMultiStepPhase_3(false);
      setMultiStepPhase_Timers_Running(prev => ({ ...prev, [phase]: false }));
    } finally {
      // Ensure loading state is reset for current phase after API call completes or if an error occurred
      if (phase === 1) setIsLoadingMultiStepPhase_1(false);
      else if (phase === 2) setIsLoadingMultiStepPhase_2(false);
      else if (phase === 3) setIsLoadingMultiStepPhase_3(false);
      setMultiStepPhase_Timers_Running(prev => ({ ...prev, [phase]: false }));
    }
  };

  const handleRunAllPhases = async () => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30); // Persist LLM model selection
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    resetOutputStates();

    // --- Phase 1 ---
    setIsLoadingMultiStepPhase_1(true);
    setMultiStepPhase_Timers_Running(prev => ({ ...prev, 1: true }));
    setMultiStepPhase_Durations(prev => ({ ...prev, 1: null }));
    setMultiStepPhase1_Input("");
    setMultiStepPhase1_Output("");
    setMultiStepPhase2_Input("");
    setMultiStepPhase2_Output("");
    setMultiStepPhase3_Input("");
    setMultiStepPhase3_Output("");

    const phase1PromptValue = buildPrompt(initialInput, defaultPhase1PromptText, null, null);
    setMultiStepPhase1_Input(phase1PromptValue);
    setActualLlmInputPrompt(phase1PromptValue); // Show user what's being sent

    executeGenerateRequest(
      '/api/generate',
      { llmModel, mode: 'advanced', fullPrompt: phase1PromptValue, runPhase: 1 },
      (phase1Data) => { // Phase 1 onSuccess
        const phase1DataOutput = phase1Data.output;
        setMultiStepPhase_Durations(prev => ({ ...prev, 1: phase1Data.duration !== undefined ? phase1Data.duration : null }));
        setActualLlmOutputPrompt(phase1Data.llmOutputPromptContent || "");

        // Populate Multi-Step Mode fields for Phase 1
        setMultiStepPhase1_Output(phase1DataOutput || "");

        if (phase1DataOutput && phase1DataOutput.trim() !== "") {
          // --- Phase 2 ---
          setIsLoadingMultiStepPhase_2(true);
          setMultiStepPhase_Timers_Running(prev => ({ ...prev, 2: true }));
          setMultiStepPhase_Durations(prev => ({ ...prev, 2: null }));
          setMultiStepPhase2_Input("");
          setMultiStepPhase2_Output("");
          setMultiStepPhase3_Input("");
          setMultiStepPhase3_Output("");

          const phase2PromptValue = (phase1DataOutput || "") + "\n\n" + defaultPhase2PromptText;
          setMultiStepPhase2_Input(phase2PromptValue);
          setActualLlmInputPrompt(phase2PromptValue); // Show user for phase 2

          executeGenerateRequest(
            '/api/generate',
            { llmModel, mode: 'advanced', fullPrompt: phase2PromptValue, runPhase: 2 },
            (phase2Data) => { // Phase 2 onSuccess
              const phase2DataOutput = phase2Data.output;
              setMultiStepPhase_Durations(prev => ({ ...prev, 2: phase2Data.duration !== undefined ? phase2Data.duration : null }));
              setActualLlmOutputPrompt(phase2Data.llmOutputPromptContent || "");

              // Populate Multi-Step Mode fields for Phase 2
              setMultiStepPhase2_Output(phase2DataOutput || "");

              if (phase2DataOutput && phase2DataOutput.trim() !== "") {
                // --- Phase 3 ---
                setIsLoadingMultiStepPhase_3(true);
                setMultiStepPhase_Timers_Running(prev => ({ ...prev, 3: true }));
                setMultiStepPhase_Durations(prev => ({ ...prev, 3: null }));
                setMultiStepPhase3_Input("");
                setMultiStepPhase3_Output("");

                const phase3PromptValue = (phase2DataOutput || "") + "\n\n" + defaultPhase3PromptText;
                setMultiStepPhase3_Input(phase3PromptValue);
                setActualLlmInputPrompt(phase3PromptValue); // Show user for phase 3

                executeGenerateRequest(
                  '/api/generate',
                  { llmModel, mode: 'advanced', fullPrompt: phase3PromptValue, runPhase: 3 },
                  (phase3Data) => { // Phase 3 onSuccess
                    const phase3GeneratedScript = phase3Data.generatedScript;
                    setMultiStepPhase_Durations(prev => ({ ...prev, 3: phase3Data.duration !== undefined ? phase3Data.duration : null }));
                    if (phase3Data.phasedOutputs) setPhasedOutputs(phase3Data.phasedOutputs);
                    setActualLlmOutputPrompt(phase3Data.llmOutputPromptContent || "");

                    // Populate Multi-Step Mode fields for Phase 3
                    setMultiStepPhase3_Output(phase3GeneratedScript || "");

                    if (!phase3GeneratedScript || phase3GeneratedScript.trim() === "") {
                      setError("Phase 3 failed to produce a script. Please check the logs or try again.");
                    }
                  },
                  (errorMessage) => { // Phase 3 onError
                    setError(`Phase 3 failed: ${errorMessage}`);
                    setMultiStepPhase3_Output("");
                  },
                  () => { // Phase 3 onFinally
                    setIsLoadingMultiStepPhase_3(false);
                    setMultiStepPhase_Timers_Running(prev => ({ ...prev, 3: false }));
                  }
                );
              } else {
                setError("Phase 2 failed to produce an output. Please check the logs or try again.");
                setIsLoadingMultiStepPhase_2(false); // Ensure loading is stopped
                setMultiStepPhase_Timers_Running(prev => ({ ...prev, 2: false }));
              }
            },
            (errorMessage) => { // Phase 2 onError
              setError(`Phase 2 failed: ${errorMessage}`);
              setMultiStepPhase2_Output("");
            },
            () => { // Phase 2 onFinally
              setIsLoadingMultiStepPhase_2(false);
              setMultiStepPhase_Timers_Running(prev => ({ ...prev, 2: false }));
            }
          );
        } else {
          setError("Phase 1 failed to produce an output. Please check the logs or try again.");
          setIsLoadingMultiStepPhase_1(false); // Ensure loading is stopped
          setMultiStepPhase_Timers_Running(prev => ({ ...prev, 1: false }));
        }
      },
      (errorMessage) => { // Phase 1 onError
        setError(`Phase 1 failed: ${errorMessage}`);
        setMultiStepPhase1_Output("");
      },
      () => { // Phase 1 onFinally
        setIsLoadingMultiStepPhase_1(false);
        setMultiStepPhase_Timers_Running(prev => ({ ...prev, 1: false }));
      }
    );
  };

  const handleExecuteScript = async () => {
    setHasExecutionAttempted(true);
    const scriptToExecute = multiStepPhase3_Output;

    if (!scriptToExecute) {
      setScriptExecutionError("No script to execute.");
      return;
    }
    setIsExecutingScript(true);
    setScriptTimerKey(prevKey => prevKey + 1); // Increment key here
    setScriptExecutionError("");
    setScriptLogOutput([]);
    setDockerCommandToDisplay(""); // Reset Docker command display
    setPhasedOutputs([]);
    setScriptExecutionDuration(null); // Reset before new execution

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: scriptToExecute }),
      });

      if (!response.ok) {
        let errorText = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch (e) {
          // Ignore if response is not JSON
        }
        playErrorSound(); // Play error sound on API failure
        throw new Error(errorText);
      }

      if (!response.body) {
        playErrorSound(); // Play error sound if response body is null
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      // let streamErrorOccurred = false; // Flag to indicate specific stream error, not used for now

      while (true) {
        let value;
        let done;
        try {
          ({ value, done } = await reader.read());
        } catch (streamReadError: any) {
          console.error("Error reading from stream:", streamReadError);
          setScriptExecutionError("Error reading script output stream. Connection may have been lost or the process terminated unexpectedly.");
          setScriptLogOutput(prev => [...prev, "STREAM_ERROR: The log stream ended unexpectedly due to a read error."]);
          // streamErrorOccurred = true;
          break; // Exit the loop
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
          // streamErrorOccurred = true;
          break; // Exit the loop
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep the last partial line in buffer

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

              // Sound playing logic is already here from previous step, ensure it's correct
              if (finalResult.overallStatus === 'failure') {
                let errorMsg = "Script execution failed.";
                if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
                setScriptExecutionError(errorMsg); // Keep this for now, might be used by other UI parts
                playErrorSound();
              } else if (finalResult.overallStatus === 'success') {
                playSuccessSound();
              }
            } catch (e) {
              console.error("Error parsing final result JSON:", e);
              setScriptExecutionError("Error parsing final result from script execution.");
              setFinalExecutionStatus('failure'); // Set status to failure on parsing error
              setFinalExecutionResult(null);
              setScriptExecutionDuration(null); // Also reset on error parsing here
              playErrorSound();
            }
          }
        }
      }
      // Process any remaining buffer content
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
                setScriptExecutionError(errorMsg); // Keep this
                playErrorSound();
              } else if (finalResult.overallStatus === 'success') {
                playSuccessSound();
              }
            } catch (e) {
              console.error("Error parsing final result JSON from remaining buffer:", e);
              setScriptExecutionError("Error parsing final result from script execution (buffer).");
              setFinalExecutionStatus('failure'); // Set status to failure on parsing error
              setFinalExecutionResult(null);
              setScriptExecutionDuration(null); // Also reset on error parsing here
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
      playErrorSound(); // Play error sound on general catch
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
        // Attempt to parse error a bit more gracefully
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If parsing JSON fails, use the status text
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      const data = await response.json();
      // setRawLlmResult(JSON.stringify(data, null, 2));
      setActualLlmInputPrompt(data.llmInputPromptContent || "");
      setActualLlmOutputPrompt(data.llmOutputPromptContent || "");
      if (data.duration !== undefined) {
        setLlmRequestDuration(data.duration);
      } else {
        setLlmRequestDuration(null); // Reset if duration is not in response
      }
      onSuccess(data);
    } catch (err) {
      console.error("API Request Error:", err);
      onError(err instanceof Error ? err.message : "An unknown API error occurred.");
      playErrorSound(); // Play error sound for LLM request errors
    } finally {
      playLlmSound(); // Play LLM finish sound regardless of success/failure
      if (onFinally) {
        onFinally();
      }
    }
  };

  return (
    <div className="flex h-screen">
      <SavedPrompts prompts={savedPrompts} onSelectPrompt={setInitialInput} onDeletePrompt={handleDeletePrompt} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center text-slate-700 dark:text-slate-200">CrewAI Studio</h1>

        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button onClick={() => setActiveTab('setup')} className={`-mb-px mr-1 rounded-t-lg border-l border-r border-t px-4 py-2 ${activeTab === 'setup' ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Setup</button>
          <button onClick={() => setActiveTab('blueprint')} className={`-mb-px mr-1 rounded-t-lg border-l border-r border-t px-4 py-2 ${activeTab === 'blueprint' ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Blueprint</button>
          <button onClick={() => setActiveTab('architecture')} className={`-mb-px mr-1 rounded-t-lg border-l border-r border-t px-4 py-2 ${activeTab === 'architecture' ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Architecture</button>
          <button onClick={() => setActiveTab('code')} className={`-mb-px mr-1 rounded-t-lg border-l border-r border-t px-4 py-2 ${activeTab === 'code' ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Code</button>
          <button onClick={() => setActiveTab('execute')} className={`-mb-px mr-1 rounded-t-lg border-l border-r border-t px-4 py-2 ${activeTab === 'execute' ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Execute</button>
        </div>

        <div className="tab-content p-6 border border-slate-200 dark:border-slate-700 rounded-b-md">
          {activeTab === 'setup' && (
            <div>
              <div className="mb-8">
                <label htmlFor="initialInstruction" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Initial User Instruction (for Phase 1)
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    id="initialInstruction"
                    name="initialInstruction"
                    rows={4}
                    className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500"
                    placeholder="Enter your initial instructions here..."
                    value={initialInput}
                    onChange={(e) => setInitialInput(e.target.value)}
                    disabled={isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
                  ></textarea>
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSavePrompt}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <CopyButton textToCopy={initialInput} />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label htmlFor="llmModelSelect" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
                  LLM Model Selection
                </label>
                <select
                  id="llmModelSelect"
                  name="llmModelSelect"
                  className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-white hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  disabled={modelsLoading || modelsError !== "" || isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
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
                {modelsError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{modelsError}</p>}
              </div>
              <div className="mb-8">
                <button
                  onClick={handleRecreateDockerImage}
                  className="w-full bg-blue-500 text-white rounded hover:bg-blue-600 px-3 py-2"
                  disabled={isRecreatingDockerImage}
                >
                  {isRecreatingDockerImage ? 'Recreating Docker Image...' : 'Recreate Docker Image'}
                </button>
              </div>
            </div>
          )}
          {activeTab === 'blueprint' && (
            <div>
              <div className="space-y-6 mb-8">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="phase1Prompt" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Phase 1 Prompt (Blueprint Definition)</label>
                    <CopyButton textToCopy={phase1Prompt} />
                  </div>
                  <textarea
                    id="phase1Prompt"
                    value={phase1Prompt}
                    onChange={(e) => setPhase1Prompt(e.target.value)}
                    rows={8}
                    className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500"
                    disabled={isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
                  />
                </div>
              </div>
              <details className="mt-4">
                <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                  <span>View Input for Phase 1</span>
                  <CopyButton textToCopy={multiStepPhase1_Input} />
                </summary>
                <pre className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2">
                  {multiStepPhase1_Input || "Input will appear here..."}
                </pre>
              </details>
              <details className="mt-4" open>
                <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                  <span>View Output of Phase 1</span>
                  <CopyButton textToCopy={multiStepPhase1_Output} />
                </summary>
                <pre className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2">
                  {multiStepPhase1_Output || "Output will appear here..."}
                </pre>
              </details>
            </div>
          )}
          {activeTab === 'architecture' && (
            <div>
              <div className="space-y-6 mb-8">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="phase2Prompt" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Phase 2 Prompt (Architecture Design / Elaboration)</label>
                    <CopyButton textToCopy={phase2Prompt} />
                  </div>
                  <textarea
                    id="phase2Prompt"
                    value={phase2Prompt}
                    onChange={(e) => setPhase2Prompt(e.target.value)}
                    rows={8}
                    className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500"
                    disabled={isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
                  />
                </div>
              </div>
              <details className="mt-4">
                <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                  <span>View Input for Phase 2</span>
                  <CopyButton textToCopy={multiStepPhase2_Input} />
                </summary>
                <pre className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2">
                  {multiStepPhase2_Input || "Input will appear here..."}
                </pre>
              </details>
              <details className="mt-4" open>
                <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                  <span>View Output of Phase 2</span>
                  <CopyButton textToCopy={multiStepPhase2_Output} />
                </summary>
                <pre className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2">
                  {multiStepPhase2_Output || "Output will appear here..."}
                </pre>
              </details>
            </div>
          )}
          {activeTab === 'code' && (
            <div>
              <div className="space-y-6 mb-8">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="phase3Prompt" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Phase 3 Prompt (Script Generation / Final Output)</label>
                    <CopyButton textToCopy={phase3Prompt} />
                  </div>
                  <textarea
                    id="phase3Prompt"
                    value={phase3Prompt}
                    onChange={(e) => setPhase3Prompt(e.target.value)}
                    rows={8}
                    className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500"
                    disabled={isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
                  />
                </div>
              </div>
              <details className="border border-slate-200 dark:border-slate-700 rounded-md shadow-sm mb-2" open>
                <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-md">
                  <span className="text-base font-medium text-slate-700 dark:text-slate-300">
                    Generated Python Script (Multi-Step Phase 3)
                  </span>
                  <CopyButton textToCopy={multiStepPhase3_Output} />
                </summary>
                <div className="w-full p-4 bg-slate-800 dark:bg-slate-800 overflow-auto min-h-[160px] rounded-b-md">
                  <SyntaxHighlighter
                    language="python"
                    style={atomDark}
                    showLineNumbers={true}
                    wrapLines={true}
                    lineProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }}
                    customStyle={{ margin: 0, backgroundColor: 'transparent', height: 'auto', minHeight: '140px', overflow: 'auto' }}
                    codeTagProps={{ style: { fontFamily: 'inherit' } }}
                  >
                    {multiStepPhase3_Output || "# Python script output will appear here"}
                  </SyntaxHighlighter>
                </div>
              </details>
            </div>
          )}
          {activeTab === 'execute' && (
            <div>
              <button
                type="button"
                onClick={() => handleExecuteScript()} // Pass script explicitly if needed, or handle inside
                disabled={
                  isExecutingScript ||
                  !multiStepPhase3_Output ||
                  (isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3)
                }
                className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-green-300 focus:outline-none dark:focus:ring-green-800"
              >
                {isExecutingScript ? 'Executing Script...' : 'Run This Script (Locally via API)'}
              </button>
              {isExecutingScript && (
                <button
                  onClick={handleInterruptScript}
                  className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-red-300 focus:outline-none dark:focus:ring-red-800"
                  disabled={isInterrupting}
                >
                  {isInterrupting ? 'Interrupting...' : 'Interrupt Script'}
                </button>
              )}
              {(multiStepPhase3_Output || scriptLogOutput.length > 0 || phasedOutputs.length > 0) && (
                <div className="grid md:grid-cols-2 gap-6 mt-10 mb-8">
                  <div>
                    <label htmlFor="scriptExecutionArea" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
                      Script Execution Output (Multi-Step Phase 3)
                    </label>
                    <div id="scriptExecutionArea" className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 shadow-sm min-h-[160px]">
                      {/* Display Docker Command */}
                      {dockerCommandToDisplay && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300">
                              Docker Command Used:
                            </h3>
                            <CopyButton textToCopy={dockerCommandToDisplay} />
                          </div>
                          <pre className="p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-inner overflow-auto whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                            {dockerCommandToDisplay}
                          </pre>
                        </div>
                      )}
                      {/* Script Execution Timer */}
                      {(isExecutingScript || (hasExecutionAttempted && scriptExecutionDuration !== null)) && (
                        <div className="mt-2 mb-2 p-2 border border-green-300 dark:border-green-700 rounded-md bg-green-50 dark:bg-green-900/30 shadow-sm text-center">
                          <p className="text-xs text-green-700 dark:text-green-300">
                            Script Execution Timer: <Timer key={scriptTimerKey} isRunning={isExecutingScript} className="inline font-semibold" />
                          </p>
                        </div>
                      )}

                      {/* Script Execution Duration Display */}
                      {scriptExecutionDuration !== null && !isExecutingScript && (
                        <div className="mt-2 mb-2 p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm text-center">
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Script execution took: <span className="font-semibold">{scriptExecutionDuration.toFixed(2)}</span> seconds
                          </p>
                        </div>
                      )}
                      {/* Live Logs */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300">
                            {isExecutingScript ? "Execution Logs (Streaming...)" : "Execution Logs:"}
                          </h3>
                          <CopyButton textToCopy={scriptLogOutput.join('\n')} />
                        </div>
                        {(scriptLogOutput.length > 0 || isExecutingScript) ? (
                          <pre className="p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-inner overflow-auto whitespace-pre-wrap max-h-[300px] min-h-[100px] text-xs text-slate-600 dark:text-slate-300">
                            {scriptLogOutput.length > 0 ? scriptLogOutput.join('\n') : "Waiting for script output..."}
                          </pre>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">No logs produced.</p>
                        )}
                      </div>

                      {/* Phased Outputs */}
                      {phasedOutputs.length > 0 && (
                        <div>
                          <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Outputs:</h3>
                          <ul className="space-y-2">
                            {phasedOutputs.map((out, index) => (
                              <li key={index} className="p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm relative">
                                <div className="flex justify-between items-start">
                                  <strong className="text-sm text-indigo-600 dark:text-indigo-400 pr-2">{out.taskName}:</strong>
                                  <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                                    <CopyButton textToCopy={out.output} />
                                  </div>
                                </div>
                                <pre className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto">{out.output}</pre>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-10">
                <button
                  type="button"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-green-300 focus:outline-none dark:focus:ring-green-800"
                  onClick={handleRunAllPhases}
                  disabled={modelsLoading || !llmModel || isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
                >
                  {isLoadingMultiStepPhase_1 ? 'Running Phase 1: Blueprint Definition...' : isLoadingMultiStepPhase_2 ? 'Running Phase 2: Architecture Elaboration...' : isLoadingMultiStepPhase_3 ? 'Running Phase 3: Script Generation...' : 'Generate Script (All Phases)'}
                </button>
                <hr className="my-8" />
                <h2 className="text-2xl font-semibold text-center text-slate-700 dark:text-slate-200">Or Run Phase by Phase</h2>
                {[1, 2, 3].map((phase) => (
                  <details key={phase} className="p-6 border border-slate-300 dark:border-slate-700 rounded-lg shadow" open>
                    <summary className="text-2xl font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                      Phase {phase}: {phase === 1 ? "Define Blueprint" : phase === 2 ? "Elaborate / Refine" : "Generate Final Output"}
                    </summary>
                    <div className="mt-4 space-y-4">
                      <button
                        onClick={() => handleMultiStepPhaseExecution(phase)}
                        disabled={
                          (phase === 1 && (isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3 || !initialInput || !phase1Prompt)) ||
                          (phase === 2 && (isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3 || !multiStepPhase1_Output || !phase2Prompt)) ||
                          (phase === 3 && (isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3 || !multiStepPhase2_Output || !phase3Prompt))
                        }
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-purple-400 focus:outline-none dark:focus:ring-purple-700"
                      >
                        {isLoadingMultiStepPhase_1 && phase === 1 && 'Running Phase 1...'}
                        {isLoadingMultiStepPhase_2 && phase === 2 && 'Running Phase 2...'}
                        {isLoadingMultiStepPhase_3 && phase === 3 && 'Running Phase 3...'}
                        {!((isLoadingMultiStepPhase_1 && phase === 1) || (isLoadingMultiStepPhase_2 && phase === 2) || (isLoadingMultiStepPhase_3 && phase === 3)) && `Run Multi-Step Phase ${phase}`}
                      </button>

                      <div className="mt-2 mb-2 p-2 border border-purple-300 dark:border-purple-700 rounded-md bg-purple-50 dark:bg-purple-900/30 shadow-sm text-center">
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          Phase {phase} LLM Request Timer: <Timer isRunning={multiStepPhase_Timers_Running[phase]} className="inline font-semibold" />
                        </p>
                      </div>
                      {multiStepPhase_Durations[phase] !== null && (
                        <div className="mt-2 mb-2 p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm text-center">
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Phase {phase} LLM request took: <span className="font-semibold">{multiStepPhase_Durations[phase]?.toFixed(2)} seconds</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* The rest of the page content will be moved into the tabs in the next steps */}

        {/* LLM Request Timer */}
        {isLlmTimerRunning && (
          <div className="mt-4 mb-4 p-3 border border-blue-300 dark:border-blue-700 rounded-md bg-blue-50 dark:bg-blue-900/30 shadow-sm text-center">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              LLM Request Timer: <Timer isRunning={isLlmTimerRunning} className="inline font-semibold" />
            </p>
          </div>
        )}

        {/* LLM Request Duration Display */}
        {llmRequestDuration !== null && !isLlmTimerRunning && (
          <div className="mt-4 mb-4 p-3 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 shadow-sm text-center">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              LLM request took: <span className="font-semibold">{llmRequestDuration.toFixed(2)}</span> seconds
            </p>
          </div>
        )}

        {/* Shared Prompt Editing Area for Advanced and Multi-Step Modes */}
      <div className="space-y-6 mb-8">
        </div>

      {/* Multi-Step Mode UI */}
      <div className="space-y-10">
        </div>

      {error && (
        <div className="mt-8 mb-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Display Final Execution Status and Details */}
      {finalExecutionStatus && (
        <div className={`mt-8 mb-4 p-4 border rounded-md ${finalExecutionStatus === 'success' ? 'border-green-400 bg-green-100 dark:bg-green-900/30' : 'border-red-400 bg-red-100 dark:bg-red-900/30'}`}>
          <h2 className={`text-xl font-semibold ${finalExecutionStatus === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-400'}`}>
            Overall Execution Status: {finalExecutionStatus.charAt(0).toUpperCase() + finalExecutionStatus.slice(1)}
          </h2>
          {finalExecutionResult && (
            <details className="mt-2">
              <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                View Execution Details
              </summary>
              <pre className="mt-2 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 shadow-inner overflow-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(finalExecutionResult, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {scriptExecutionError && !finalExecutionStatus && ( // Only show if finalExecutionStatus isn't already displaying the error context
        <div className="mt-8 mb-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
          <p className="font-semibold">Script Execution Error:</p>
          <p>{scriptExecutionError}</p>
        </div>
      )}

      </main>
    </div>
  );
}

// Helper function to parse phased outputs from script stdout
// This function needs to be defined outside the component or imported
const parsePhasedOutputs = (stdout: string): PhasedOutput[] => {
  const outputs: PhasedOutput[] = [];
  // Example parsing logic, adjust based on actual stdout format
  // This is a placeholder and might need refinement
  const lines = stdout.split('\n');
  let currentTaskName = "Unknown Task";
  let currentOutput = "";

  for (const line of lines) {
    // Assuming task names might be prefixed, e.g., "TASK_START: Task Name"
    // Or you might have a more structured output.
    // This is highly dependent on how your `main.py` in crewAI prints information.
    if (line.includes("crewAI Task Output:")) { // A potential marker for task output
      if (currentOutput) { // Save previous task's output
        outputs.push({ taskName: currentTaskName, output: currentOutput.trim() });
      }
      // Attempt to extract a task name, this is a guess.
      // You might need a more robust way to identify tasks.
      const nameMatch = line.match(/Task Name: (.*?)(?:\s|$)/);
      currentTaskName = nameMatch ? nameMatch[1] : "Unnamed Task";
      currentOutput = line.substring(line.indexOf("crewAI Task Output:") + "crewAI Task Output:".length);
    } else {
      currentOutput += `\n${line}`;
    }
  }
  if (currentOutput.trim()) { // Add the last collected output
    outputs.push({ taskName: currentTaskName, output: currentOutput.trim() });
  }
  return outputs;
};
