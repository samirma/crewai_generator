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
  const [initialInput, setInitialInput] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("");
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [executionOutput, setExecutionOutput] = useState<string>(""); // Used for simple mode's docker output
  const [isExecutingScript, setIsExecutingScript] = useState<boolean>(false);
  const [scriptExecutionError, setScriptExecutionError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading for simple mode
  const [error, setError] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [modelsError, setModelsError] = useState<string>("");
  const [phasedOutputs, setPhasedOutputs] = useState<PhasedOutput[]>([]); // For simple mode's task outputs
  const [scriptLogOutput, setScriptLogOutput] = useState<string[]>([]);
  const [dockerCommandToDisplay, setDockerCommandToDisplay] = useState<string>("");

  // Advanced Mode State
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [phase1Prompt, setPhase1Prompt] = useState<string>("");
  const [phase2Prompt, setPhase2Prompt] = useState<string>("");
  const [phase3Prompt, setPhase3Prompt] = useState<string>("");
  const [phase1Output, setPhase1Output] = useState<string>(""); // Blueprint
  const [phase2Output, setPhase2Output] = useState<string>(""); // Architecture Plan
  const [phase3GeneratedTaskOutputs, setPhase3GeneratedTaskOutputs] = useState<PhasedOutput[]>([]);
  const [currentPhaseRunning, setCurrentPhaseRunning] = useState<number | null>(null);
  const [isLoadingPhase, setIsLoadingPhase] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });
  const [displayedPrompt, setDisplayedPrompt] = useState<string>("");
  const [rawLlmResult, setRawLlmResult] = useState<string>("");
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

  // New state variables for Multi-Step Mode
  const [currentOperatingMode, setCurrentOperatingMode] = useState<string>('simple'); // 'simple', 'advanced', 'multistep'
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

  // State for Simple Multi-Step Mode
  const [simpleMultiStepPhase1_Input, setSimpleMultiStepPhase1_Input] = useState<string>("");
  const [simpleMultiStepPhase1_Output, setSimpleMultiStepPhase1_Output] = useState<string>("");
  const [simpleMultiStepPhase1_Duration, setSimpleMultiStepPhase1_Duration] = useState<number | null>(null);
  const [isLoadingSimpleMultiStepPhase1, setIsLoadingSimpleMultiStepPhase1] = useState<boolean>(false);

  const [simpleMultiStepPhase2_Input, setSimpleMultiStepPhase2_Input] = useState<string>("");
  const [simpleMultiStepPhase2_Output, setSimpleMultiStepPhase2_Output] = useState<string>("");
  const [simpleMultiStepPhase2_Duration, setSimpleMultiStepPhase2_Duration] = useState<number | null>(null);
  const [isLoadingSimpleMultiStepPhase2, setIsLoadingSimpleMultiStepPhase2] = useState<boolean>(false);

  const [simpleMultiStepPhase3_Input, setSimpleMultiStepPhase3_Input] = useState<string>("");
  const [simpleMultiStepPhase3_Output, setSimpleMultiStepPhase3_Output] = useState<string>("");
  const [simpleMultiStepPhase3_Duration, setSimpleMultiStepPhase3_Duration] = useState<number | null>(null);
  const [isLoadingSimpleMultiStepPhase3, setIsLoadingSimpleMultiStepPhase3] = useState<boolean>(false);
  const [hasSimpleMultiStepAttempted, setHasSimpleMultiStepAttempted] = useState<boolean>(false);


  const isLlmTimerRunning = isLoading || !!isLoadingPhase[1] || !!isLoadingPhase[2] || !!isLoadingPhase[3] || isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3 || isLoadingSimpleMultiStepPhase1 || isLoadingSimpleMultiStepPhase2 || isLoadingSimpleMultiStepPhase3;

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
    setGeneratedScript("");
    setExecutionOutput("");
    setPhasedOutputs([]);
    setDisplayedPrompt("");
    setScriptExecutionError("");
    setModelsError("");
    setRawLlmResult("");
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

    // Reset Simple Multi-Step states
    setSimpleMultiStepPhase1_Input("");
    setSimpleMultiStepPhase1_Output("");
    setSimpleMultiStepPhase1_Duration(null);
    setIsLoadingSimpleMultiStepPhase1(false);
    setSimpleMultiStepPhase2_Input("");
    setSimpleMultiStepPhase2_Output("");
    setSimpleMultiStepPhase2_Duration(null);
    setIsLoadingSimpleMultiStepPhase2(false);
    setSimpleMultiStepPhase3_Input("");
    setSimpleMultiStepPhase3_Output("");
    setSimpleMultiStepPhase3_Duration(null);
    setIsLoadingSimpleMultiStepPhase3(false);
    setHasSimpleMultiStepAttempted(false);
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
      setGeneratedScript(""); // Clear final script from any previous runs
      setPhase3GeneratedTaskOutputs([]); // Clear any associated task outputs
    } else if (phase === 2) {
      setMultiStepPhase2_Input(""); setMultiStepPhase2_Output("");
      setMultiStepPhase3_Input(""); setMultiStepPhase3_Output(""); // Clear phase 3 input/output
      setGeneratedScript("");
      setPhase3GeneratedTaskOutputs([]);
    } else if (phase === 3) {
      setMultiStepPhase3_Input(""); setMultiStepPhase3_Output("");
      setGeneratedScript("");
      setPhase3GeneratedTaskOutputs([]);
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
            setGeneratedScript(data.generatedScript || "");
            if (data.phasedOutputs) { // In case phase 3 also returns phased outputs
              setPhase3GeneratedTaskOutputs(data.phasedOutputs);
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

  // Inside Home component, before handleSimpleModeSubmit and handleRunPhase
  const handleUnifiedGenerateRequest = async (
    mode: 'simple' | 'advanced',
    fullPromptValue: string,
    onSuccessCallback: (data: any) => void,
    currentRunPhase?: number | null
  ) => {
    // Pre-flight checks (cookie, llmModel) and resetOutputStates() are assumed to be done by callers.

    // 1. Set Loading States
    if (mode === 'simple') {
      setIsLoading(true);
    } else if (currentRunPhase) { // Advanced mode
      setIsLoadingPhase(prev => ({ ...prev, [currentRunPhase]: true }));
      setCurrentPhaseRunning(currentRunPhase);
    }

    // 2. Set Displayed Prompt
    setDisplayedPrompt(fullPromptValue);

    // 3. Construct Payload
    const payload: any = {
      llmModel, // from Home component's state
      mode: mode,
      fullPrompt: fullPromptValue,
    };
    if (mode === 'advanced' && currentRunPhase) {
      payload.runPhase = currentRunPhase;
    }

    // 4. Execute API Call (ensure executeGenerateRequest is defined or imported)
    await executeGenerateRequest(
      '/api/generate',
      payload,
      (data) => {
        onSuccessCallback(data);
      },
      (errorMessage) => {
        setError(errorMessage); // setError from Home component's state
      },
      () => { // finally handler
        if (mode === 'simple') {
          setIsLoading(false);
        } else if (currentRunPhase) { // Advanced mode
          setIsLoadingPhase(prev => ({ ...prev, [currentRunPhase]: false }));
          setCurrentPhaseRunning(null);
        }
      }
    );
  };

  const handleSimpleModeSubmit = async () => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30); // Persist LLM model selection
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    resetOutputStates();

    const fullPrompt = buildPrompt(initialInput, defaultPhase1PromptText, defaultPhase2PromptText, defaultPhase3PromptText);

    await handleUnifiedGenerateRequest(
      'simple',
      fullPrompt,
      (data) => { // onSuccessCallback for simple mode
        setGeneratedScript(data.generatedScript);
        setPhasedOutputs(data.phasedOutputs || []);
        setExecutionOutput("");
      }
      // No currentRunPhase for simple mode, so it will be undefined
    );
  };

  const handleSimpleModeMultiStepSubmit = async () => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30); // Persist LLM model selection
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    setHasSimpleMultiStepAttempted(true); // Mark that an attempt has been made
    resetOutputStates(); // This will also clear the new simpleMultiStep states, but we set attempted true above

    // --- Phase 1 ---
    setIsLoadingSimpleMultiStepPhase1(true);
    setSimpleMultiStepPhase1_Input(""); // Clear previous input/output for this phase
    setSimpleMultiStepPhase1_Output("");
    setSimpleMultiStepPhase1_Duration(null);
    setSimpleMultiStepPhase2_Input(""); // Clear subsequent phases' data
    setSimpleMultiStepPhase2_Output("");
    setSimpleMultiStepPhase2_Duration(null);
    setSimpleMultiStepPhase3_Input("");
    setSimpleMultiStepPhase3_Output("");
    setSimpleMultiStepPhase3_Duration(null);
    setGeneratedScript(""); // Clear final script

    const phase1PromptValue = buildPrompt(initialInput, defaultPhase1PromptText, null, null);
    setSimpleMultiStepPhase1_Input(phase1PromptValue);
    setActualLlmInputPrompt(phase1PromptValue); // Show user what's being sent

    // Phase 1 Execution
    executeGenerateRequest(
      '/api/generate',
      { llmModel, mode: 'advanced', fullPrompt: phase1PromptValue, runPhase: 1 },
      (phase1Data) => { // Phase 1 onSuccess
        const phase1DataOutput = phase1Data.output;
        setSimpleMultiStepPhase1_Output(phase1DataOutput || "");
        setSimpleMultiStepPhase1_Duration(phase1Data.duration !== undefined ? phase1Data.duration : null);
        setActualLlmOutputPrompt(phase1Data.llmOutputPromptContent || "");

        // Populate Multi-Step Mode fields for Phase 1
        setMultiStepPhase1_Input(phase1PromptValue);
        setMultiStepPhase1_Output(phase1DataOutput || "");

        if (phase1DataOutput && phase1DataOutput.trim() !== "") {
          // --- Phase 2 ---
          setIsLoadingSimpleMultiStepPhase2(true);
          setSimpleMultiStepPhase2_Input("");
          setSimpleMultiStepPhase2_Output("");
          setSimpleMultiStepPhase2_Duration(null);
          setSimpleMultiStepPhase3_Input("");
          setSimpleMultiStepPhase3_Output("");
          setSimpleMultiStepPhase3_Duration(null);
          setGeneratedScript("");

          const phase2PromptValue = (phase1DataOutput || "") + "\n\n" + defaultPhase2PromptText;
          setSimpleMultiStepPhase2_Input(phase2PromptValue);
          setActualLlmInputPrompt(phase2PromptValue); // Show user for phase 2

          executeGenerateRequest(
            '/api/generate',
            { llmModel, mode: 'advanced', fullPrompt: phase2PromptValue, runPhase: 2 },
            (phase2Data) => { // Phase 2 onSuccess
              const phase2DataOutput = phase2Data.output;
              setSimpleMultiStepPhase2_Output(phase2DataOutput || "");
              setSimpleMultiStepPhase2_Duration(phase2Data.duration !== undefined ? phase2Data.duration : null);
              setActualLlmOutputPrompt(phase2Data.llmOutputPromptContent || "");

              // Populate Multi-Step Mode fields for Phase 2
              setMultiStepPhase2_Input(phase2PromptValue);
              setMultiStepPhase2_Output(phase2DataOutput || "");

              if (phase2DataOutput && phase2DataOutput.trim() !== "") {
                // --- Phase 3 ---
                setIsLoadingSimpleMultiStepPhase3(true);
                setSimpleMultiStepPhase3_Input("");
                setSimpleMultiStepPhase3_Output("");
                setSimpleMultiStepPhase3_Duration(null);
                setGeneratedScript("");

                const phase3PromptValue = (phase2DataOutput || "") + "\n\n" + defaultPhase3PromptText;
                setSimpleMultiStepPhase3_Input(phase3PromptValue);
                setActualLlmInputPrompt(phase3PromptValue); // Show user for phase 3

                executeGenerateRequest(
                  '/api/generate',
                  { llmModel, mode: 'advanced', fullPrompt: phase3PromptValue, runPhase: 3 },
                  (phase3Data) => { // Phase 3 onSuccess
                    const phase3GeneratedScript = phase3Data.generatedScript;
                    setSimpleMultiStepPhase3_Output(phase3GeneratedScript || "");
                    setGeneratedScript(phase3GeneratedScript || "");
                    setSimpleMultiStepPhase3_Duration(phase3Data.duration !== undefined ? phase3Data.duration : null);
                    if (phase3Data.phasedOutputs) setPhasedOutputs(phase3Data.phasedOutputs);
                    setActualLlmOutputPrompt(phase3Data.llmOutputPromptContent || "");

                    // Populate Multi-Step Mode fields for Phase 3
                    setMultiStepPhase3_Input(phase3PromptValue);
                    setMultiStepPhase3_Output(phase3GeneratedScript || "");

                    if (!phase3GeneratedScript || phase3GeneratedScript.trim() === "") {
                      setError("Phase 3 failed to produce a script. Please check the logs or try again.");
                    }
                  },
                  (errorMessage) => { // Phase 3 onError
                    setError(`Phase 3 failed: ${errorMessage}`);
                    setSimpleMultiStepPhase3_Output("");
                    setGeneratedScript("");
                  },
                  () => { // Phase 3 onFinally
                    setIsLoadingSimpleMultiStepPhase3(false);
                    setCurrentOperatingMode('multistep'); // Switch to Multi-Step Mode
                  }
                );
              } else {
                setError("Phase 2 failed to produce an output. Please check the logs or try again.");
                setIsLoadingSimpleMultiStepPhase2(false); // Ensure loading is stopped
              }
            },
            (errorMessage) => { // Phase 2 onError
              setError(`Phase 2 failed: ${errorMessage}`);
              setSimpleMultiStepPhase2_Output("");
            },
            () => { // Phase 2 onFinally
              setIsLoadingSimpleMultiStepPhase2(false);
            }
          );
        } else {
          setError("Phase 1 failed to produce an output. Please check the logs or try again.");
          setIsLoadingSimpleMultiStepPhase1(false); // Ensure loading is stopped
        }
      },
      (errorMessage) => { // Phase 1 onError
        setError(`Phase 1 failed: ${errorMessage}`);
        setSimpleMultiStepPhase1_Output("");
      },
      () => { // Phase 1 onFinally
        setIsLoadingSimpleMultiStepPhase1(false);
      }
    );
  };

  const handleRunPhase = async (phase: number) => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30); // Persist LLM model selection
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    resetOutputStates();

    // Phase-specific output clearing before the main request logic
    if (phase === 1) {
      setPhase1Output("");
      setPhase2Output("");
      // setGeneratedScript(""); // Handled by resetOutputStates
    } else if (phase === 2) {
      setPhase2Output("");
      // setGeneratedScript(""); // Handled by resetOutputStates
    }
    // No specific output clearing for phase 3 that isn't covered by resetOutputStates

    let fullPromptValue = "";
    if (phase === 1) {
      fullPromptValue = buildPrompt(initialInput, phase1Prompt , null, null);
    } else if (phase === 2) {
      fullPromptValue = buildPrompt(initialInput, phase1Prompt, phase2Prompt, null);
    } else if (phase === 3) {
      fullPromptValue = buildPrompt(initialInput, phase1Prompt, phase2Prompt, phase3Prompt);
    }

    await handleUnifiedGenerateRequest(
      'advanced',
      fullPromptValue,
      (data) => { // onSuccessCallback for advanced mode
        if (phase === 1) {
          setPhase1Output(data.output);
        } else if (phase === 2) {
          setPhase2Output(data.output);
        } else if (phase === 3) {
          setGeneratedScript(data.generatedScript);
          setPhase3GeneratedTaskOutputs(data.phasedOutputs || []);
        }
      },
      phase // currentRunPhase
    );
  };


  const handleExecuteScript = async () => {
    setHasExecutionAttempted(true);
    const scriptToExecute = currentOperatingMode === 'multistep' ? multiStepPhase3_Output : generatedScript;

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
    setExecutionOutput("");
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
      <SavedPrompts prompts={savedPrompts} onSelectPrompt={setInitialInput} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center text-slate-700 dark:text-slate-200">CrewAI Studio</h1>

        {/* Operating Mode Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-center text-slate-700 dark:text-slate-200">Operating Mode</h2>
          <div className="flex items-center justify-center space-x-2 md:space-x-4">
            {(['simple', 'advanced', 'multistep'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setCurrentOperatingMode(mode);
                  resetOutputStates(); // Reset common outputs
                  // Clear mode-specific outputs
                  if (mode === 'simple') {
                    setPhase1Output(""); setPhase2Output(""); // Clear advanced
                    setMultiStepPhase1_Output(""); setMultiStepPhase2_Output(""); setMultiStepPhase3_Output(""); // Clear multistep
                  } else if (mode === 'advanced') {
                    setGeneratedScript(""); setPhasedOutputs([]); // Clear simple
                    setMultiStepPhase1_Output(""); setMultiStepPhase2_Output(""); setMultiStepPhase3_Output(""); // Clear multistep
                  } else if (mode === 'multistep') {
                    setGeneratedScript(""); setPhasedOutputs([]); // Clear simple
                    setPhase1Output(""); setPhase2Output(""); // Clear advanced
                  }
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out
                  ${currentOperatingMode === mode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
                  }
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
              >
                {mode === 'simple' && "Simple Mode"}
                {mode === 'advanced' && "Advanced Mode"}
                {mode === 'multistep' && "Multi-Step Mode"}
              </button>
            ))}
          </div>
        </div>

        {/* Shared Prompt Editing Area - initialInput always visible */}
        <div className="mb-8">
          <label htmlFor="initialInstruction" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
            {currentOperatingMode === 'advanced' || currentOperatingMode === 'multistep' ? "Initial User Instruction (for Phase 1)" : "Initial Instruction Input"}
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
              disabled={isLoading || isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3] || isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3 || isLoadingSimpleMultiStepPhase1 || isLoadingSimpleMultiStepPhase2 || isLoadingSimpleMultiStepPhase3}
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
            disabled={isLoading || modelsLoading || modelsError !== "" || isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3] || isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3 || isLoadingSimpleMultiStepPhase1 || isLoadingSimpleMultiStepPhase2 || isLoadingSimpleMultiStepPhase3}
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

        {/* Display Full Prompt Section */}
        {actualLlmInputPrompt && (
          <div className="mt-6 mb-8 p-4 border border-slate-300 dark:border-slate-700 rounded-lg shadow">
            <details>
              <summary className="text-lg font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex justify-between items-center">
                <span>View Full Prompt Sent to LLM</span>
                <CopyButton textToCopy={actualLlmInputPrompt} />
              </summary>
              <pre className="mt-2 p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                {actualLlmInputPrompt}
              </pre>
            </details>
          </div>
        )}

    {/* Display Raw LLM Result Section */}
    {actualLlmOutputPrompt && (
      <div className="mt-6 mb-8 p-4 border border-slate-300 dark:border-slate-700 rounded-lg shadow">
        <details>
          <summary className="text-lg font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex justify-between items-center">
            <span>View Raw LLM Result</span>
            <CopyButton textToCopy={actualLlmOutputPrompt} />
          </summary>
          <pre className="mt-2 p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            {actualLlmOutputPrompt}
          </pre>
        </details>
      </div>
    )}

      {/* Shared Prompt Editing Area for Advanced and Multi-Step Modes */}
      {(currentOperatingMode === 'advanced' || currentOperatingMode === 'multistep') && (
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
              disabled={isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3] || isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
            />
          </div>
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
              disabled={isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3] || isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
            />
          </div>
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
              disabled={isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3] || isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3}
            />
          </div>
        </div>
      )}

      {/* Simple Mode UI */}
      {currentOperatingMode === 'simple' && (
        <div className="mb-8 flex space-x-2"> {/* Modified this line to use flex and add spacing */}
          <button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:focus:ring-blue-800"
            onClick={handleSimpleModeSubmit}
            disabled={isLoading || modelsLoading || !llmModel || isLoadingSimpleMultiStepPhase1 || isLoadingSimpleMultiStepPhase2 || isLoadingSimpleMultiStepPhase3}
          >
            {isLoading || isLoadingSimpleMultiStepPhase1 || isLoadingSimpleMultiStepPhase2 || isLoadingSimpleMultiStepPhase3 ? 'Generating...' : (modelsLoading ? 'Loading models...' : 'Run Simple Mode')}
          </button>
          {/* New Button Added Here */}
          <button
            type="button"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-green-300 focus:outline-none dark:focus:ring-green-800"
            onClick={handleSimpleModeMultiStepSubmit}
            disabled={isLoading || modelsLoading || !llmModel || isLoadingSimpleMultiStepPhase1 || isLoadingSimpleMultiStepPhase2 || isLoadingSimpleMultiStepPhase3}
          >
            {isLoadingSimpleMultiStepPhase1 ? 'Running Phase 1...' : isLoadingSimpleMultiStepPhase2 ? 'Running Phase 2...' : isLoadingSimpleMultiStepPhase3 ? 'Running Phase 3...' : (isLoading ? 'Generating...' : 'Run Simple Mode with Multi step')}
          </button>
        </div>
      )}

      {/* Simple Mode - Multi-step Execution Details */}
      {currentOperatingMode === 'simple' && hasSimpleMultiStepAttempted && (
        <div className="my-8 p-4 border border-slate-300 dark:border-slate-700 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-center text-slate-700 dark:text-slate-200">
            Simple Mode - Multi-step Execution Details
          </h2>
          <div className="space-y-6">
            {[1, 2, 3].map((phase) => {
              const phaseName = phase === 1 ? "Blueprint Definition" : phase === 2 ? "Architecture Elaboration" : "Script Generation";
              const isLoadingPhase = phase === 1 ? isLoadingSimpleMultiStepPhase1 : phase === 2 ? isLoadingSimpleMultiStepPhase2 : isLoadingSimpleMultiStepPhase3;
              const phaseInput = phase === 1 ? simpleMultiStepPhase1_Input : phase === 2 ? simpleMultiStepPhase2_Input : simpleMultiStepPhase3_Input;
              const phaseOutput = phase === 1 ? simpleMultiStepPhase1_Output : phase === 2 ? simpleMultiStepPhase2_Output : simpleMultiStepPhase3_Output;
              const phaseDuration = phase === 1 ? simpleMultiStepPhase1_Duration : phase === 2 ? simpleMultiStepPhase2_Duration : simpleMultiStepPhase3_Duration;

              return (
                <details key={phase} className="p-4 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm" open>
                  <summary className="text-lg font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                    Phase {phase}: {phaseName}
                    {isLoadingPhase && <span className="ml-2 text-sm text-blue-500">(Running...)</span>}
                  </summary>
                  <div className="mt-3 space-y-3">
                    {phaseDuration !== null && !isLoadingPhase && (
                      <div className="p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
                        LLM request took: <span className="font-semibold">{phaseDuration.toFixed(2)} seconds</span>
                      </div>
                    )}
                    {phaseInput && (
                      <details className="mt-2">
                        <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center">
                          <span>View Input for Phase {phase}</span>
                          <CopyButton textToCopy={phaseInput} />
                        </summary>
                        <pre className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800 shadow-inner overflow-auto whitespace-pre-wrap min-h-[80px] text-xs">
                          {phaseInput}
                        </pre>
                      </details>
                    )}
                    {phaseOutput && (
                      <details className="mt-2" open>
                        <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center">
                          <span>View Output of Phase {phase}</span>
                          <CopyButton textToCopy={phaseOutput} />
                        </summary>
                        <pre className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] text-xs">
                          {phaseOutput}
                        </pre>
                      </details>
                    )}
                    {!phaseInput && !phaseOutput && !isLoadingPhase && (
                       <p className="text-sm text-slate-500 dark:text-slate-400">Phase {phase} has not run or produced output yet.</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {/* Advanced Mode UI */}
      {currentOperatingMode === 'advanced' && (
        <div className="space-y-10">
          {/* Phase 1 */}
          <div className="p-6 border border-slate-300 dark:border-slate-700 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Phase 1: Define Blueprint</h2>
            {/* Prompt Textarea for Phase 1 is now in the shared section */}
            <button
              onClick={() => handleRunPhase(1)}
              disabled={isLoadingPhase[1] || modelsLoading || !llmModel || isLoadingPhase[2] || isLoadingPhase[3] || !initialInput || !phase1Prompt}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:focus:ring-indigo-700 mt-3"
            >
              {isLoadingPhase[1] ? 'Running Phase 1...' : 'Run Phase 1 (Define Blueprint)'}
            </button>
            {phase1Output && (
              <div className="mt-4">
                <details open>
                  <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                    <span>Phase 1 Output (Blueprint)</span>
                    <CopyButton textToCopy={phase1Output} />
                  </summary>
                  <pre
                    className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2"
                  >{phase1Output || "Blueprint output will appear here..."}</pre>
                </details>
              </div>
            )}
            {!phase1Output && (
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Phase 1 Output (Blueprint)</label>
                    <pre
                      className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    >{"Blueprint output will appear here..."}</pre>
                </div>
            )}
          </div>

          {/* Phase 2 */}
          <div className="p-6 border border-slate-300 dark:border-slate-700 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Phase 2: Design Crew Architecture Plan</h2>
            {/* Prompt Textarea for Phase 2 is now in the shared section */}
            <button
              onClick={() => handleRunPhase(2)}
              disabled={isLoadingPhase[2] || modelsLoading || !llmModel || isLoadingPhase[1] || isLoadingPhase[3] || !phase1Output || !phase2Prompt}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:focus:ring-indigo-700 mt-3"
            >
              {isLoadingPhase[2] ? 'Running Phase 2...' : 'Run Phase 2 (Design Architecture)'}
            </button>
            {phase2Output && (
              <div className="mt-4">
                <details open>
                  <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                    <span>Phase 2 Output (Architecture Plan)</span>
                    <CopyButton textToCopy={phase2Output} />
                  </summary>
                  <pre
                    className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2"
                  >{phase2Output || "Architecture plan output will appear here..."}</pre>
                </details>
              </div>
            )}
            {!phase2Output && (
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Phase 2 Output (Architecture Plan)</label>
                    <pre
                      className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    >{"Architecture plan output will appear here..."}</pre>
                </div>
            )}
          </div>

          {/* Phase 3 */}
          <div className="p-6 border border-slate-300 dark:border-slate-700 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Phase 3: Construct Python Script</h2>
            {/* Prompt Textarea for Phase 3 is now in the shared section */}
            <button
              onClick={() => handleRunPhase(3)}
              disabled={isLoadingPhase[3] || modelsLoading || !llmModel || isLoadingPhase[1] || isLoadingPhase[2] || !phase2Output || !phase3Prompt}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:focus:ring-indigo-700 mt-3"
            >
              {isLoadingPhase[3] ? 'Running Phase 3...' : 'Run Phase 3 (Generate Script)'}
            </button>
            {phase3GeneratedTaskOutputs && phase3GeneratedTaskOutputs.length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Phase 3 Generation - Predicted Task Outputs</label>
                <ul className="space-y-2 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 shadow-inner min-h-[100px]">
                  {phase3GeneratedTaskOutputs.map((out, index) => (
                    <li key={index} className="p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm relative">
                      <div className="flex justify-between items-start">
                        <strong className="text-sm text-indigo-600 dark:text-indigo-400 pr-2">{out.taskName}:</strong>
                        <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                           <CopyButton textToCopy={out.output} />
                        </div>
                      </div>
                      <pre className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto">
                        {out.output}
                      </pre>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Step Mode UI */}
      {currentOperatingMode === 'multistep' && (
        <div className="space-y-10">
          {[1, 2, 3].map((phase) => (
            <details key={phase} className="p-6 border border-slate-300 dark:border-slate-700 rounded-lg shadow" open>
              <summary className="text-2xl font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                Multi-Step Phase {phase}: {phase === 1 ? "Define Blueprint" : phase === 2 ? "Elaborate / Refine" : "Generate Final Output"}
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

                <details className="mt-4">
                  <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                    <span>View Input for Phase {phase}</span>
                    <CopyButton textToCopy={
                      phase === 1 ? multiStepPhase1_Input :
                      phase === 2 ? multiStepPhase2_Input :
                      multiStepPhase3_Input
                    } />
                  </summary>
                  <pre className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2">
                    {(phase === 1 ? multiStepPhase1_Input : phase === 2 ? multiStepPhase2_Input : multiStepPhase3_Input) || "Input will appear here..."}
                  </pre>
                </details>

                <details className="mt-4" open>
                  <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                    <span>View Output of Phase {phase}</span>
                    <CopyButton textToCopy={
                      phase === 1 ? multiStepPhase1_Output :
                      phase === 2 ? multiStepPhase2_Output :
                      multiStepPhase3_Output
                    } />
                  </summary>
                  <pre className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2">
                    {(phase === 1 ? multiStepPhase1_Output : phase === 2 ? multiStepPhase2_Output : multiStepPhase3_Output) || "Output will appear here..."}
                  </pre>
                </details>
              </div>
            </details>
          ))}
        </div>
      )}

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

      {/* Output sections: Generated Script and Script Execution Output / Phased Outputs */}
      {((currentOperatingMode !== 'multistep' && (generatedScript || scriptLogOutput.length > 0 || phasedOutputs.length > 0 || finalExecutionStatus)) ||
        (currentOperatingMode === 'multistep' && (multiStepPhase3_Output || scriptLogOutput.length > 0 || phasedOutputs.length > 0))) && (
         <div className="grid md:grid-cols-2 gap-6 mt-10 mb-8">
          <div>
            <label htmlFor="scriptExecutionArea" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
              {currentOperatingMode === 'advanced' && isLoadingPhase[3] ? "Phase 3 Script Execution Output" :
               currentOperatingMode === 'advanced' ? "Script Execution Output (Phase 3)" :
               currentOperatingMode === 'multistep' && isLoadingMultiStepPhase_3 ? "Multi-Step Phase 3 Script Execution Output" :
               currentOperatingMode === 'multistep' ? "Script Execution Output (Multi-Step Phase 3)" :
               "Script Execution Output (Simple Mode)"}
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
          <div> {/* This is the main container for this part of the UI, likely a grid column */}
            <details className="border border-slate-200 dark:border-slate-700 rounded-md shadow-sm mb-2" open>
              <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-md">
                <span className="text-base font-medium text-slate-700 dark:text-slate-300">
                  {currentOperatingMode === 'multistep' ? "Generated Python Script (Multi-Step Phase 3)" :
                   currentOperatingMode === 'advanced' && isLoadingPhase[3] ? "Phase 3 Generated Python Script" :
                   currentOperatingMode === 'advanced' ? "Generated Python Script (Phase 3)" :
                   "Generated Python Script (Simple Mode)"}
                </span>
                <CopyButton textToCopy={currentOperatingMode === 'multistep' ? multiStepPhase3_Output : generatedScript} />
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
                  {(currentOperatingMode === 'multistep' ? multiStepPhase3_Output : generatedScript) || "# Python script output will appear here"}
                </SyntaxHighlighter>
              </div>
            </details>
            <button
              type="button"
              onClick={() => handleExecuteScript()} // Pass script explicitly if needed, or handle inside
              disabled={
                isExecutingScript ||
                (currentOperatingMode === 'multistep' ? !multiStepPhase3_Output : !generatedScript) ||
                (currentOperatingMode === 'advanced' && (isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3])) ||
                (currentOperatingMode === 'multistep' && (isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3)) ||
                (currentOperatingMode === 'simple' && (isLoading || isLoadingSimpleMultiStepPhase1 || isLoadingSimpleMultiStepPhase2 || isLoadingSimpleMultiStepPhase3))
              }
              className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-green-300 focus:outline-none dark:focus:ring-green-800"
            >
              {isExecutingScript ? 'Executing Script...' : 'Run This Script (Locally via API)'}
            </button>
          </div>
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
