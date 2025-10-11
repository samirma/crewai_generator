"use client";

import { useState, useEffect, useRef } from 'react';
import SavedPrompts from './components/SavedPrompts';
import Timer from './components/Timer';
import { buildPrompt } from '../utils/promptUtils';
import ProjectSetup from './components/ProjectSetup';
import GenerationTab from './components/GenerationTab';
import ExecutionTab from './components/ExecutionTab';

import type { ExecutionResult as ExecutionResultType } from './api/execute/types';

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

const DEFAULT_PHASE1_PROMPT_FILENAME = "phase1_blueprint_prompt.md";
const DEFAULT_PHASE2_PROMPT_FILENAME = "phase2_architecture_prompt.md";
const DEFAULT_PHASE3_PROMPT_FILENAME = "phase3_user_preference_prompt.md";
const DEFAULT_PHASE4_PROMPT_FILENAME = "phase3_pyproject_prompt.md";
const DEFAULT_PHASE5_PROMPT_FILENAME = "phase3_agents_prompt.md";
const DEFAULT_PHASE6_PROMPT_FILENAME = "phase3_tasks_prompt.md";
const DEFAULT_PHASE7_PROMPT_FILENAME = "phase3_crew_prompt.md";
const DEFAULT_PHASE8_PROMPT_FILENAME = "phase3_main_prompt.md";
const DEFAULT_PHASE9_PROMPT_FILENAME = "phase3_tools_prompt.md";

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

  // Advanced Mode State
  const [phase1Prompt, setPhase1Prompt] = useState<string>("");
  const [phase2Prompt, setPhase2Prompt] = useState<string>("");
  const [phase3Prompt, setPhase3Prompt] = useState<string>("");
  const [phase4Prompt, setPhase4Prompt] = useState<string>("");
  const [phase5Prompt, setPhase5Prompt] = useState<string>("");
  const [phase6Prompt, setPhase6Prompt] = useState<string>("");
  const [phase7Prompt, setPhase7Prompt] = useState<string>("");
  const [phase8Prompt, setPhase8Prompt] = useState<string>("");
  const [phase9Prompt, setPhase9Prompt] = useState<string>("");
  const [llmRequestDuration, setLlmRequestDuration] = useState<number | null>(null);
  const [scriptExecutionDuration, setScriptExecutionDuration] = useState<number | null>(null);
  const [hasExecutionAttempted, setHasExecutionAttempted] = useState<boolean>(false);
  const [scriptTimerKey, setScriptTimerKey] = useState<number>(0);
  const [defaultPhase1PromptText, setDefaultPhase1PromptText] = useState<string>("");
  const [defaultPhase2PromptText, setDefaultPhase2PromptText] = useState<string>("");
  const [defaultPhase3PromptText, setDefaultPhase3PromptText] = useState<string>("");
  const [defaultPhase4PromptText, setDefaultPhase4PromptText] = useState<string>("");
  const [defaultPhase5PromptText, setDefaultPhase5PromptText] = useState<string>("");
  const [defaultPhase6PromptText, setDefaultPhase6PromptText] = useState<string>("");
  const [defaultPhase7PromptText, setDefaultPhase7PromptText] = useState<string>("");
  const [defaultPhase8PromptText, setDefaultPhase8PromptText] = useState<string>("");
  const [defaultPhase9PromptText, setDefaultPhase9PromptText] = useState<string>("");

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
  const [multiStepPhase4_Input, setMultiStepPhase4_Input] = useState<string>("");
  const [multiStepPhase4_Output, setMultiStepPhase4_Output] = useState<string>("");
  const [multiStepPhase5_Input, setMultiStepPhase5_Input] = useState<string>("");
  const [multiStepPhase5_Output, setMultiStepPhase5_Output] = useState<string>("");
  const [multiStepPhase6_Input, setMultiStepPhase6_Input] = useState<string>("");
  const [multiStepPhase6_Output, setMultiStepPhase6_Output] = useState<string>("");
  const [multiStepPhase7_Input, setMultiStepPhase7_Input] = useState<string>("");
  const [multiStepPhase7_Output, setMultiStepPhase7_Output] = useState<string>("");
  const [multiStepPhase8_Input, setMultiStepPhase8_Input] = useState<string>("");
  const [multiStepPhase8_Output, setMultiStepPhase8_Output] = useState<string>("");
  const [multiStepPhase9_Input, setMultiStepPhase9_Input] = useState<string>("");
  const [multiStepPhase9_Output, setMultiStepPhase9_Output] = useState<string>("");
  const [isLoadingMultiStepPhase_1, setIsLoadingMultiStepPhase_1] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_2, setIsLoadingMultiStepPhase_2] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_3, setIsLoadingMultiStepPhase_3] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_4, setIsLoadingMultiStepPhase_4] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_5, setIsLoadingMultiStepPhase_5] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_6, setIsLoadingMultiStepPhase_6] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_7, setIsLoadingMultiStepPhase_7] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_8, setIsLoadingMultiStepPhase_8] = useState<boolean>(false);
  const [isLoadingMultiStepPhase_9, setIsLoadingMultiStepPhase_9] = useState<boolean>(false);
  const [multiStepPhase_Durations, setMultiStepPhase_Durations] = useState<Record<number, number | null>>({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null });
  const [multiStepPhase_Timers_Running, setMultiStepPhase_Timers_Running] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false });

  // State to manage the active phase for visual highlighting
  const [currentActivePhase, setCurrentActivePhase] = useState<number | null>(null);
  // State for managing active tab
  const [activeTab, setActiveTab] = useState<'generation' | 'execution'>('generation');


  const isLlmTimerRunning = isLoadingMultiStepPhase_1 || isLoadingMultiStepPhase_2 || isLoadingMultiStepPhase_3 || isLoadingMultiStepPhase_4 || isLoadingMultiStepPhase_5 || isLoadingMultiStepPhase_6 || isLoadingMultiStepPhase_7 || isLoadingMultiStepPhase_8 || isLoadingMultiStepPhase_9;

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
        const r1 = await fetch(`/prompts/${DEFAULT_PHASE1_PROMPT_FILENAME}`);
        const r2 = await fetch(`/prompts/${DEFAULT_PHASE2_PROMPT_FILENAME}`);
        const r3 = await fetch(`/prompts/${DEFAULT_PHASE3_PROMPT_FILENAME}`);
        const r4 = await fetch(`/prompts/${DEFAULT_PHASE4_PROMPT_FILENAME}`);
        const r5 = await fetch(`/prompts/${DEFAULT_PHASE5_PROMPT_FILENAME}`);
        const r6 = await fetch(`/prompts/${DEFAULT_PHASE6_PROMPT_FILENAME}`);
        const r7 = await fetch(`/prompts/${DEFAULT_PHASE7_PROMPT_FILENAME}`);
        const r8 = await fetch(`/prompts/${DEFAULT_PHASE8_PROMPT_FILENAME}`);
        const r9 = await fetch(`/prompts/${DEFAULT_PHASE9_PROMPT_FILENAME}`);


        if (!r1.ok || !r2.ok || !r3.ok || !r4.ok || !r5.ok || !r6.ok || !r7.ok || !r8.ok || !r9.ok) {
          console.error("Failed to fetch one or more default prompts.");
          setError("Failed to load default prompts for Advanced Mode. You may need to copy them manually if running locally. Check console for details.");
          if (!r1.ok) console.error(`Phase 1 prompt fetch failed: ${r1.status}`);
          if (!r2.ok) console.error(`Phase 2 prompt fetch failed: ${r2.status}`);
          if (!r3.ok) console.error(`Phase 3 prompt fetch failed: ${r3.status}`);
          if (!r4.ok) console.error(`Phase 4 prompt fetch failed: ${r4.status}`);
          if (!r5.ok) console.error(`Phase 5 prompt fetch failed: ${r5.status}`);
          if (!r6.ok) console.error(`Phase 6 prompt fetch failed: ${r6.status}`);
          if (!r7.ok) console.error(`Phase 7 prompt fetch failed: ${r7.status}`);
          if (!r8.ok) console.error(`Phase 8 prompt fetch failed: ${r8.status}`);
          if (!r9.ok) console.error(`Phase 9 prompt fetch failed: ${r9.status}`);
          return;
        }

        const p1Text = await r1.text();
        const p2Text = await r2.text();
        const p3Text = await r3.text();
        const p4Text = await r4.text();
        const p5Text = await r5.text();
        const p6Text = await r6.text();
        const p7Text = await r7.text();
        const p8Text = await r8.text();
        const p9Text = await r9.text();

        setPhase1Prompt(p1Text);
        setDefaultPhase1PromptText(p1Text);
        setPhase2Prompt(p2Text);
        setDefaultPhase2PromptText(p2Text);
        setPhase3Prompt(p3Text);
        setDefaultPhase3PromptText(p3Text);
        setPhase4Prompt(p4Text);
        setDefaultPhase4PromptText(p4Text);
        setPhase5Prompt(p5Text);
        setDefaultPhase5PromptText(p5Text);
        setPhase6Prompt(p6Text);
        setDefaultPhase6PromptText(p6Text);
        setPhase7Prompt(p7Text);
        setDefaultPhase7PromptText(p7Text);
        setPhase8Prompt(p8Text);
        setDefaultPhase8PromptText(p8Text);
        setPhase9Prompt(p9Text);
        setDefaultPhase9PromptText(p9Text);
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

    setMultiStepPhase1_Input("");
    setMultiStepPhase1_Output("");
    setMultiStepPhase2_Input("");
    setMultiStepPhase2_Output("");
    setMultiStepPhase3_Input("");
    setMultiStepPhase3_Output("");
    setMultiStepPhase4_Input("");
    setMultiStepPhase4_Output("");
    setMultiStepPhase5_Input("");
    setMultiStepPhase5_Output("");
    setMultiStepPhase6_Input("");
    setMultiStepPhase6_Output("");
    setMultiStepPhase7_Input("");
    setMultiStepPhase7_Output("");
    setMultiStepPhase8_Input("");
    setMultiStepPhase8_Output("");
    setMultiStepPhase9_Input("");
    setMultiStepPhase9_Output("");
    setIsLoadingMultiStepPhase_1(false);
    setIsLoadingMultiStepPhase_2(false);
    setIsLoadingMultiStepPhase_3(false);
    setIsLoadingMultiStepPhase_4(false);
    setIsLoadingMultiStepPhase_5(false);
    setIsLoadingMultiStepPhase_6(false);
    setIsLoadingMultiStepPhase_7(false);
    setIsLoadingMultiStepPhase_8(false);
    setIsLoadingMultiStepPhase_9(false);
    setMultiStepPhase_Durations({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null });
    setMultiStepPhase_Timers_Running({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false });
    setCurrentActivePhase(null);
  };

  const handleMultiStepPhaseExecution = async (phase: number) => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30);
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }

    setError("");
    setScriptExecutionError("");
    setFinalExecutionStatus(null);
    setFinalExecutionResult(null);
    setDockerCommandToDisplay("");
    setScriptLogOutput([]);
    setPhasedOutputs([]);
    setScriptExecutionDuration(null);

    if (phase === 1) setIsLoadingMultiStepPhase_1(true);
    else if (phase === 2) setIsLoadingMultiStepPhase_2(true);
    else if (phase === 3) setIsLoadingMultiStepPhase_3(true);
    else if (phase === 4) setIsLoadingMultiStepPhase_4(true);
    else if (phase === 5) setIsLoadingMultiStepPhase_5(true);
    else if (phase === 6) setIsLoadingMultiStepPhase_6(true);
    else if (phase === 7) setIsLoadingMultiStepPhase_7(true);
    else if (phase === 8) setIsLoadingMultiStepPhase_8(true);
    else if (phase === 9) setIsLoadingMultiStepPhase_9(true);


    setMultiStepPhase_Timers_Running(prev => ({ ...prev, [phase]: true }));
    setMultiStepPhase_Durations(prev => ({ ...prev, [phase]: null }));
    setCurrentActivePhase(phase);

    if (phase === 1) {
      setMultiStepPhase1_Input(""); setMultiStepPhase1_Output("");
      setMultiStepPhase2_Input(""); setMultiStepPhase2_Output("");
      setMultiStepPhase3_Input(""); setMultiStepPhase3_Output("");
      setMultiStepPhase4_Input(""); setMultiStepPhase4_Output("");
      setMultiStepPhase5_Input(""); setMultiStepPhase5_Output("");
      setMultiStepPhase6_Input(""); setMultiStepPhase6_Output("");
      setMultiStepPhase7_Input(""); setMultiStepPhase7_Output("");
      setMultiStepPhase8_Input(""); setMultiStepPhase8_Output("");
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    } else if (phase === 2) {
      setMultiStepPhase2_Input(""); setMultiStepPhase2_Output("");
      setMultiStepPhase3_Input(""); setMultiStepPhase3_Output("");
      setMultiStepPhase4_Input(""); setMultiStepPhase4_Output("");
      setMultiStepPhase5_Input(""); setMultiStepPhase5_Output("");
      setMultiStepPhase6_Input(""); setMultiStepPhase6_Output("");
      setMultiStepPhase7_Input(""); setMultiStepPhase7_Output("");
      setMultiStepPhase8_Input(""); setMultiStepPhase8_Output("");
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    } else if (phase === 3) {
      setMultiStepPhase3_Input(""); setMultiStepPhase3_Output("");
      setMultiStepPhase4_Input(""); setMultiStepPhase4_Output("");
      setMultiStepPhase5_Input(""); setMultiStepPhase5_Output("");
      setMultiStepPhase6_Input(""); setMultiStepPhase6_Output("");
      setMultiStepPhase7_Input(""); setMultiStepPhase7_Output("");
      setMultiStepPhase8_Input(""); setMultiStepPhase8_Output("");
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    } else if (phase === 4) {
      setMultiStepPhase4_Input(""); setMultiStepPhase4_Output("");
      setMultiStepPhase5_Input(""); setMultiStepPhase5_Output("");
      setMultiStepPhase6_Input(""); setMultiStepPhase6_Output("");
      setMultiStepPhase7_Input(""); setMultiStepPhase7_Output("");
      setMultiStepPhase8_Input(""); setMultiStepPhase8_Output("");
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    } else if (phase === 5) {
      setMultiStepPhase5_Input(""); setMultiStepPhase5_Output("");
      setMultiStepPhase6_Input(""); setMultiStepPhase6_Output("");
      setMultiStepPhase7_Input(""); setMultiStepPhase7_Output("");
      setMultiStepPhase8_Input(""); setMultiStepPhase8_Output("");
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    } else if (phase === 6) {
      setMultiStepPhase6_Input(""); setMultiStepPhase6_Output("");
      setMultiStepPhase7_Input(""); setMultiStepPhase7_Output("");
      setMultiStepPhase8_Input(""); setMultiStepPhase8_Output("");
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    } else if (phase === 7) {
      setMultiStepPhase7_Input(""); setMultiStepPhase7_Output("");
      setMultiStepPhase8_Input(""); setMultiStepPhase8_Output("");
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    } else if (phase === 8) {
      setMultiStepPhase8_Input(""); setMultiStepPhase8_Output("");
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    } else if (phase === 9) {
      setMultiStepPhase9_Input(""); setMultiStepPhase9_Output("");
    }


    let fullPromptValue = "";
    try {
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
      } else if (phase === 4) {
        if (!multiStepPhase3_Output.trim()) {
          setError("Phase 3 output is missing. Cannot run Phase 4.");
          throw new Error("Missing Phase 3 output for Phase 4.");
        }
        if (!phase4Prompt.trim()) {
          setError("Phase 4 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 4.");
        }
        fullPromptValue = multiStepPhase3_Output + "\n\n" + phase4Prompt;
        setMultiStepPhase4_Input(fullPromptValue);
      } else if (phase === 5) {
        if (!multiStepPhase4_Output.trim()) {
          setError("Phase 4 output is missing. Cannot run Phase 5.");
          throw new Error("Missing Phase 4 output for Phase 5.");
        }
        if (!phase5Prompt.trim()) {
          setError("Phase 5 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 5.");
        }
        fullPromptValue = multiStepPhase4_Output + "\n\n" + phase5Prompt;
        setMultiStepPhase5_Input(fullPromptValue);
      } else if (phase === 6) {
        if (!multiStepPhase5_Output.trim()) {
          setError("Phase 5 output is missing. Cannot run Phase 6.");
          throw new Error("Missing Phase 5 output for Phase 6.");
        }
        if (!phase6Prompt.trim()) {
          setError("Phase 6 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 6.");
        }
        fullPromptValue = multiStepPhase5_Output + "\n\n" + phase6Prompt;
        setMultiStepPhase6_Input(fullPromptValue);
      } else if (phase === 7) {
        if (!multiStepPhase6_Output.trim()) {
          setError("Phase 6 output is missing. Cannot run Phase 7.");
          throw new Error("Missing Phase 6 output for Phase 7.");
        }
        if (!phase7Prompt.trim()) {
          setError("Phase 7 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 7.");
        }
        fullPromptValue = multiStepPhase6_Output + "\n\n" + phase7Prompt;
        setMultiStepPhase7_Input(fullPromptValue);
      } else if (phase === 8) {
        if (!multiStepPhase7_Output.trim()) {
          setError("Phase 7 output is missing. Cannot run Phase 8.");
          throw new Error("Missing Phase 7 output for Phase 8.");
        }
        if (!phase8Prompt.trim()) {
          setError("Phase 8 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 8.");
        }
        fullPromptValue = multiStepPhase7_Output + "\n\n" + phase8Prompt;
        setMultiStepPhase8_Input(fullPromptValue);
      } else if (phase === 9) {
        if (!multiStepPhase8_Output.trim()) {
          setError("Phase 8 output is missing. Cannot run Phase 9.");
          throw new Error("Missing Phase 8 output for Phase 9.");
        }
        if (!phase9Prompt.trim()) {
          setError("Phase 9 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 9.");
        }
        fullPromptValue = multiStepPhase8_Output + "\n\n" + phase9Prompt;
        setMultiStepPhase9_Input(fullPromptValue);
      } else if (phase === 4) {
        if (!multiStepPhase3_Output.trim()) {
          setError("Phase 3 output is missing. Cannot run Phase 4.");
          throw new Error("Missing Phase 3 output for Phase 4.");
        }
        if (!phase4Prompt.trim()) {
          setError("Phase 4 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 4.");
        }
        fullPromptValue = multiStepPhase3_Output + "\n\n" + phase4Prompt;
        setMultiStepPhase4_Input(fullPromptValue);
      } else if (phase === 5) {
        if (!multiStepPhase4_Output.trim()) {
          setError("Phase 4 output is missing. Cannot run Phase 5.");
          throw new Error("Missing Phase 4 output for Phase 5.");
        }
        if (!phase5Prompt.trim()) {
          setError("Phase 5 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 5.");
        }
        fullPromptValue = multiStepPhase4_Output + "\n\n" + phase5Prompt;
        setMultiStepPhase5_Input(fullPromptValue);
      } else if (phase === 6) {
        if (!multiStepPhase5_Output.trim()) {
          setError("Phase 5 output is missing. Cannot run Phase 6.");
          throw new Error("Missing Phase 5 output for Phase 6.");
        }
        if (!phase6Prompt.trim()) {
          setError("Phase 6 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 6.");
        }
        fullPromptValue = multiStepPhase5_Output + "\n\n" + phase6Prompt;
        setMultiStepPhase6_Input(fullPromptValue);
      } else if (phase === 7) {
        if (!multiStepPhase6_Output.trim()) {
          setError("Phase 6 output is missing. Cannot run Phase 7.");
          throw new Error("Missing Phase 6 output for Phase 7.");
        }
        if (!phase7Prompt.trim()) {
          setError("Phase 7 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 7.");
        }
        fullPromptValue = multiStepPhase6_Output + "\n\n" + phase7Prompt;
        setMultiStepPhase7_Input(fullPromptValue);
      } else if (phase === 8) {
        if (!multiStepPhase7_Output.trim()) {
          setError("Phase 7 output is missing. Cannot run Phase 8.");
          throw new Error("Missing Phase 7 output for Phase 8.");
        }
        if (!phase8Prompt.trim()) {
          setError("Phase 8 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 8.");
        }
        fullPromptValue = multiStepPhase7_Output + "\n\n" + phase8Prompt;
        setMultiStepPhase8_Input(fullPromptValue);
      } else if (phase === 9) {
        if (!multiStepPhase8_Output.trim()) {
          setError("Phase 8 output is missing. Cannot run Phase 9.");
          throw new Error("Missing Phase 8 output for Phase 9.");
        }
        if (!phase9Prompt.trim()) {
          setError("Phase 9 prompt cannot be empty.");
          throw new Error("Prompt validation failed for Phase 9.");
        }
        fullPromptValue = multiStepPhase8_Output + "\n\n" + phase9Prompt;
        setMultiStepPhase9_Input(fullPromptValue);
      } else {
        setError("Invalid phase number provided.");
        throw new Error("Invalid phase number.");
      }

      const payload = {
        llmModel,
        mode: 'advanced',
        fullPrompt: fullPromptValue,
        runPhase: phase,
      };

      await executeGenerateRequest(
        '/api/generate',
        payload,
        (data) => {
          setMultiStepPhase_Durations(prev => ({ ...prev, [phase]: data.duration !== undefined ? data.duration : null }));

          if (phase === 1) {
            setMultiStepPhase1_Output(data.output || "");
          } else if (phase === 2) {
            setMultiStepPhase2_Output(data.output || "");
          } else if (phase === 3) {
            setMultiStepPhase3_Output(data.output || "");
          } else if (phase === 4) {
            setMultiStepPhase4_Output(data.output || "");
          } else if (phase === 5) {
            setMultiStepPhase5_Output(data.output || "");
          } else if (phase === 6) {
            setMultiStepPhase6_Output(data.output || "");
          } else if (phase === 7) {
            setMultiStepPhase7_Output(data.output || "");
          } else if (phase === 8) {
            setMultiStepPhase8_Output(data.output || "");
          } else if (phase === 9) {
            setMultiStepPhase9_Output(data.generatedScript || "");
            if (data.phasedOutputs) {
              setPhasedOutputs(data.phasedOutputs);
            }
          }
        },
        (errorMessage) => {
          setError(errorMessage);
        }
      );

    } catch (err) {
      if (err instanceof Error && !error) {
        setError(err.message);
      }
      if (phase === 1) setIsLoadingMultiStepPhase_1(false);
      else if (phase === 2) setIsLoadingMultiStepPhase_2(false);
      else if (phase === 3) setIsLoadingMultiStepPhase_3(false);
      else if (phase === 4) setIsLoadingMultiStepPhase_4(false);
      else if (phase === 5) setIsLoadingMultiStepPhase_5(false);
      else if (phase === 6) setIsLoadingMultiStepPhase_6(false);
      else if (phase === 7) setIsLoadingMultiStepPhase_7(false);
      else if (phase === 8) setIsLoadingMultiStepPhase_8(false);
      else if (phase === 9) setIsLoadingMultiStepPhase_9(false);
      setMultiStepPhase_Timers_Running(prev => ({ ...prev, [phase]: false }));
      setCurrentActivePhase(null);
    } finally {
      if (phase === 1) setIsLoadingMultiStepPhase_1(false);
      else if (phase === 2) setIsLoadingMultiStepPhase_2(false);
      else if (phase === 3) setIsLoadingMultiStepPhase_3(false);
      else if (phase === 4) setIsLoadingMultiStepPhase_4(false);
      else if (phase === 5) setIsLoadingMultiStepPhase_5(false);
      else if (phase === 6) setIsLoadingMultiStepPhase_6(false);
      else if (phase === 7) setIsLoadingMultiStepPhase_7(false);
      else if (phase === 8) setIsLoadingMultiStepPhase_8(false);
      else if (phase === 9) setIsLoadingMultiStepPhase_9(false);
      setMultiStepPhase_Timers_Running(prev => ({ ...prev, [phase]: false }));
      setCurrentActivePhase(null);
    }
  };

  const handleRunAllPhases = async () => {
    setCookie('initialInstruction', initialInput, 30);
    setCookie('llmModelSelection', llmModel, 30);
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    resetOutputStates();
    setCurrentActivePhase(1);
    setActiveTab('generation'); // Ensure generation tab is active when running all phases

    // --- Phase 1 ---
    setIsLoadingMultiStepPhase_1(true);
    setMultiStepPhase_Timers_Running(prev => ({ ...prev, 1: true }));
    setMultiStepPhase_Durations(prev => ({ ...prev, 1: null }));

    const phase1PromptValue = buildPrompt(initialInput, defaultPhase1PromptText, null, null);
    setMultiStepPhase1_Input(phase1PromptValue);

    await executeGenerateRequest(
      '/api/generate',
      { llmModel, mode: 'advanced', fullPrompt: phase1PromptValue, runPhase: 1 },
      async (phase1Data) => {
        const phase1DataOutput = phase1Data.output;
        setMultiStepPhase_Durations(prev => ({ ...prev, 1: phase1Data.duration !== undefined ? phase1Data.duration : null }));
        setMultiStepPhase1_Output(phase1DataOutput || "");

        setIsLoadingMultiStepPhase_1(false);
        setMultiStepPhase_Timers_Running(prev => ({ ...prev, 1: false }));
        setCurrentActivePhase(null);

        if (phase1DataOutput && phase1DataOutput.trim() !== "") {
          // --- Phase 2 ---
          setCurrentActivePhase(2);
          setIsLoadingMultiStepPhase_2(true);
          setMultiStepPhase_Timers_Running(prev => ({ ...prev, 2: true }));
          setMultiStepPhase_Durations(prev => ({ ...prev, 2: null }));

          const phase2PromptValue = (phase1DataOutput || "") + "\n\n" + defaultPhase2PromptText;
          setMultiStepPhase2_Input(phase2PromptValue);

          await executeGenerateRequest(
            '/api/generate',
            { llmModel, mode: 'advanced', fullPrompt: phase2PromptValue, runPhase: 2 },
            async (phase2Data) => {
              const phase2DataOutput = phase2Data.output;
              setMultiStepPhase_Durations(prev => ({ ...prev, 2: phase2Data.duration !== undefined ? phase2Data.duration : null }));
              setMultiStepPhase2_Output(phase2DataOutput || "");

              setIsLoadingMultiStepPhase_2(false);
              setMultiStepPhase_Timers_Running(prev => ({ ...prev, 2: false }));
              setCurrentActivePhase(null);

              if (phase2DataOutput && phase2DataOutput.trim() !== "") {
                // --- Phase 3 ---
                setCurrentActivePhase(3);
                setIsLoadingMultiStepPhase_3(true);
                setMultiStepPhase_Timers_Running(prev => ({ ...prev, 3: true }));
                setMultiStepPhase_Durations(prev => ({ ...prev, 3: null }));

                const phase3PromptValue = (phase2DataOutput || "") + "\n\n" + defaultPhase3PromptText;
                setMultiStepPhase3_Input(phase3PromptValue);

                await executeGenerateRequest(
                  '/api/generate',
                  { llmModel, mode: 'advanced', fullPrompt: phase3PromptValue, runPhase: 3 },
                  async (phase3Data) => {
                    const phase3DataOutput = phase3Data.output;
                    setMultiStepPhase_Durations(prev => ({ ...prev, 3: phase3Data.duration !== undefined ? phase3Data.duration : null }));
                    setMultiStepPhase3_Output(phase3DataOutput || "");

                    if (phase3DataOutput && phase3DataOutput.trim() !== "") {
                      // --- Phase 4 ---
                      setCurrentActivePhase(4);
                      setIsLoadingMultiStepPhase_4(true);
                      setMultiStepPhase_Timers_Running(prev => ({ ...prev, 4: true }));
                      const phase4PromptValue = (phase3DataOutput || "") + "\n\n" + defaultPhase4PromptText;
                      setMultiStepPhase4_Input(phase4PromptValue);

                      await executeGenerateRequest(
                        '/api/generate',
                        { llmModel, mode: 'advanced', fullPrompt: phase4PromptValue, runPhase: 4 },
                        async (phase4Data) => {
                          const phase4DataOutput = phase4Data.output;
                          setMultiStepPhase_Durations(prev => ({ ...prev, 4: phase4Data.duration !== undefined ? phase4Data.duration : null }));
                          setMultiStepPhase4_Output(phase4DataOutput || "");

                          if (phase4DataOutput && phase4DataOutput.trim() !== "") {
                            // --- Phase 5 ---
                            setCurrentActivePhase(5);
                            setIsLoadingMultiStepPhase_5(true);
                            setMultiStepPhase_Timers_Running(prev => ({ ...prev, 5: true }));
                            const phase5PromptValue = (phase4DataOutput || "") + "\n\n" + defaultPhase5PromptText;
                            setMultiStepPhase5_Input(phase5PromptValue);

                            await executeGenerateRequest(
                              '/api/generate',
                              { llmModel, mode: 'advanced', fullPrompt: phase5PromptValue, runPhase: 5 },
                              async (phase5Data) => {
                                const phase5DataOutput = phase5Data.output;
                                setMultiStepPhase_Durations(prev => ({ ...prev, 5: phase5Data.duration !== undefined ? phase5Data.duration : null }));
                                setMultiStepPhase5_Output(phase5DataOutput || "");

                                if (phase5DataOutput && phase5DataOutput.trim() !== "") {
                                  // --- Phase 6 ---
                                  setCurrentActivePhase(6);
                                  setIsLoadingMultiStepPhase_6(true);
                                  setMultiStepPhase_Timers_Running(prev => ({ ...prev, 6: true }));
                                  const phase6PromptValue = (phase5DataOutput || "") + "\n\n" + defaultPhase6PromptText;
                                  setMultiStepPhase6_Input(phase6PromptValue);

                                  await executeGenerateRequest(
                                    '/api/generate',
                                    { llmModel, mode: 'advanced', fullPrompt: phase6PromptValue, runPhase: 6 },
                                    async (phase6Data) => {
                                      const phase6DataOutput = phase6Data.output;
                                      setMultiStepPhase_Durations(prev => ({ ...prev, 6: phase6Data.duration !== undefined ? phase6Data.duration : null }));
                                      setMultiStepPhase6_Output(phase6DataOutput || "");

                                      if (phase6DataOutput && phase6DataOutput.trim() !== "") {
                                        // --- Phase 7 ---
                                        setCurrentActivePhase(7);
                                        setIsLoadingMultiStepPhase_7(true);
                                        setMultiStepPhase_Timers_Running(prev => ({ ...prev, 7: true }));
                                        const phase7PromptValue = (phase6DataOutput || "") + "\n\n" + defaultPhase7PromptText;
                                        setMultiStepPhase7_Input(phase7PromptValue);

                                        await executeGenerateRequest(
                                          '/api/generate',
                                          { llmModel, mode: 'advanced', fullPrompt: phase7PromptValue, runPhase: 7 },
                                          async (phase7Data) => {
                                            const phase7DataOutput = phase7Data.output;
                                            setMultiStepPhase_Durations(prev => ({ ...prev, 7: phase7Data.duration !== undefined ? phase7Data.duration : null }));
                                            setMultiStepPhase7_Output(phase7DataOutput || "");

                                            if (phase7DataOutput && phase7DataOutput.trim() !== "") {
                                              // --- Phase 8 ---
                                              setCurrentActivePhase(8);
                                              setIsLoadingMultiStepPhase_8(true);
                                              setMultiStepPhase_Timers_Running(prev => ({ ...prev, 8: true }));
                                              const phase8PromptValue = (phase7DataOutput || "") + "\n\n" + defaultPhase8PromptText;
                                              setMultiStepPhase8_Input(phase8PromptValue);

                                              await executeGenerateRequest(
                                                '/api/generate',
                                                { llmModel, mode: 'advanced', fullPrompt: phase8PromptValue, runPhase: 8 },
                                                async (phase8Data) => {
                                                  const phase8DataOutput = phase8Data.output;
                                                  setMultiStepPhase_Durations(prev => ({ ...prev, 8: phase8Data.duration !== undefined ? phase8Data.duration : null }));
                                                  setMultiStepPhase8_Output(phase8DataOutput || "");

                                                  if (phase8DataOutput && phase8DataOutput.trim() !== "") {
                                                    // --- Phase 9 ---
                                                    setCurrentActivePhase(9);
                                                    setIsLoadingMultiStepPhase_9(true);
                                                    setMultiStepPhase_Timers_Running(prev => ({ ...prev, 9: true }));
                                                    const phase9PromptValue = (phase8DataOutput || "") + "\n\n" + defaultPhase9PromptText;
                                                    setMultiStepPhase9_Input(phase9PromptValue);

                                                    await executeGenerateRequest(
                                                      '/api/generate',
                                                      { llmModel, mode: 'advanced', fullPrompt: phase9PromptValue, runPhase: 9 },
                                                      (phase9Data) => {
                                                        setMultiStepPhase_Durations(prev => ({ ...prev, 9: phase9Data.duration !== undefined ? phase9Data.duration : null }));
                                                        setMultiStepPhase9_Output(phase9Data.generatedScript || "");
                                                        if (phase9Data.phasedOutputs) {
                                                          setPhasedOutputs(phase9Data.phasedOutputs);
                                                        }
                                                      },
                                                      (errorMessage) => setError(`Phase 9 failed: ${errorMessage}`),
                                                      () => {
                                                        setIsLoadingMultiStepPhase_9(false);
                                                        setMultiStepPhase_Timers_Running(prev => ({ ...prev, 9: false }));
                                                        setCurrentActivePhase(null);
                                                      }
                                                    );
                                                  } else {
                                                    setError("Phase 8 failed to produce an output.");
                                                  }
                                                },
                                                (errorMessage) => setError(`Phase 8 failed: ${errorMessage}`),
                                                () => {
                                                  setIsLoadingMultiStepPhase_8(false);
                                                  setMultiStepPhase_Timers_Running(prev => ({ ...prev, 8: false }));
                                                  setCurrentActivePhase(null);
                                                }
                                              );
                                            } else {
                                              setError("Phase 7 failed to produce an output.");
                                            }
                                          },
                                          (errorMessage) => setError(`Phase 7 failed: ${errorMessage}`),
                                          () => {
                                            setIsLoadingMultiStepPhase_7(false);
                                            setMultiStepPhase_Timers_Running(prev => ({ ...prev, 7: false }));
                                            setCurrentActivePhase(null);
                                          }
                                        );
                                      } else {
                                        setError("Phase 6 failed to produce an output.");
                                      }
                                    },
                                    (errorMessage) => setError(`Phase 6 failed: ${errorMessage}`),
                                    () => {
                                      setIsLoadingMultiStepPhase_6(false);
                                      setMultiStepPhase_Timers_Running(prev => ({ ...prev, 6: false }));
                                      setCurrentActivePhase(null);
                                    }
                                  );
                                } else {
                                  setError("Phase 5 failed to produce an output.");
                                }
                              },
                              (errorMessage) => setError(`Phase 5 failed: ${errorMessage}`),
                              () => {
                                setIsLoadingMultiStepPhase_5(false);
                                setMultiStepPhase_Timers_Running(prev => ({ ...prev, 5: false }));
                                setCurrentActivePhase(null);
                              }
                            );
                          } else {
                            setError("Phase 4 failed to produce an output.");
                          }
                        },
                        (errorMessage) => setError(`Phase 4 failed: ${errorMessage}`),
                        () => {
                          setIsLoadingMultiStepPhase_4(false);
                          setMultiStepPhase_Timers_Running(prev => ({ ...prev, 4: false }));
                          setCurrentActivePhase(null);
                        }
                      );
                    } else {
                      setError("Phase 3 failed to produce an output. Please check the logs or try again.");
                    }
                  },
                  (errorMessage) => {
                    setError(`Phase 3 failed: ${errorMessage}`);
                    setMultiStepPhase3_Output("");
                  },
                  () => {
                    setIsLoadingMultiStepPhase_3(false);
                    setMultiStepPhase_Timers_Running(prev => ({ ...prev, 3: false }));
                    setCurrentActivePhase(null);
                  }
                );
              } else {
                setError("Phase 2 failed to produce an output. Please check the logs or try again.");
                setIsLoadingMultiStepPhase_2(false);
                setMultiStepPhase_Timers_Running(prev => ({ ...prev, 2: false }));
                setCurrentActivePhase(null);
              }
            },
            (errorMessage) => {
              setError(`Phase 2 failed: ${errorMessage}`);
              setMultiStepPhase2_Output("");
            },
            () => {
              setIsLoadingMultiStepPhase_2(false);
              setMultiStepPhase_Timers_Running(prev => ({ ...prev, 2: false }));
              setCurrentActivePhase(null);
            }
          );
        } else {
          setError("Phase 1 failed to produce an output. Please check the logs or try again.");
          setIsLoadingMultiStepPhase_1(false);
          setMultiStepPhase_Timers_Running(prev => ({ ...prev, 1: false }));
          setCurrentActivePhase(null);
        }
      },
      (errorMessage) => {
        setError(`Phase 1 failed: ${errorMessage}`);
        setMultiStepPhase1_Output("");
      },
      () => {
        setIsLoadingMultiStepPhase_1(false);
        setMultiStepPhase_Timers_Running(prev => ({ ...prev, 1: false }));
        setCurrentActivePhase(null);
      }
    );
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
    onSuccess: (data: Record<string, unknown>) => void,
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
        } catch {
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
          isLlmTimerRunning={isLlmTimerRunning}
          isExecutingScript={isExecutingScript}
          handleRunAllPhases={handleRunAllPhases}
        />

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
                isLoadingMultiStepPhase_1={isLoadingMultiStepPhase_1}
                isLoadingMultiStepPhase_2={isLoadingMultiStepPhase_2}
                isLoadingMultiStepPhase_3={isLoadingMultiStepPhase_3}
                isLoadingMultiStepPhase_4={isLoadingMultiStepPhase_4}
                isLoadingMultiStepPhase_5={isLoadingMultiStepPhase_5}
                isLoadingMultiStepPhase_6={isLoadingMultiStepPhase_6}
                isLoadingMultiStepPhase_7={isLoadingMultiStepPhase_7}
                isLoadingMultiStepPhase_8={isLoadingMultiStepPhase_8}
                isLoadingMultiStepPhase_9={isLoadingMultiStepPhase_9}
                phase1Prompt={phase1Prompt}
                setPhase1Prompt={setPhase1Prompt}
                phase2Prompt={phase2Prompt}
                setPhase2Prompt={setPhase2Prompt}
                phase3Prompt={phase3Prompt}
                setPhase3Prompt={setPhase3Prompt}
                phase4Prompt={phase4Prompt}
                setPhase4Prompt={setPhase4Prompt}
                phase5Prompt={phase5Prompt}
                setPhase5Prompt={setPhase5Prompt}
                phase6Prompt={phase6Prompt}
                setPhase6Prompt={setPhase6Prompt}
                phase7Prompt={phase7Prompt}
                setPhase7Prompt={setPhase7Prompt}
                phase8Prompt={phase8Prompt}
                setPhase8Prompt={setPhase8Prompt}
                phase9Prompt={phase9Prompt}
                setPhase9Prompt={setPhase9Prompt}
                isLlmTimerRunning={isLlmTimerRunning}
                isExecutingScript={isExecutingScript}
                handleMultiStepPhaseExecution={handleMultiStepPhaseExecution}
                initialInput={initialInput}
                multiStepPhase1_Output={multiStepPhase1_Output}
                multiStepPhase2_Output={multiStepPhase2_Output}
                multiStepPhase3_Output={multiStepPhase3_Output}
                multiStepPhase4_Output={multiStepPhase4_Output}
                multiStepPhase5_Output={multiStepPhase5_Output}
                multiStepPhase6_Output={multiStepPhase6_Output}
                multiStepPhase7_Output={multiStepPhase7_Output}
                multiStepPhase8_Output={multiStepPhase8_Output}
                multiStepPhase9_Output={multiStepPhase9_Output}
                multiStepPhase_Timers_Running={multiStepPhase_Timers_Running}
                multiStepPhase_Durations={multiStepPhase_Durations}
                multiStepPhase1_Input={multiStepPhase1_Input}
                setMultiStepPhase1_Input={setMultiStepPhase1_Input}
                multiStepPhase2_Input={multiStepPhase2_Input}
                setMultiStepPhase2_Input={setMultiStepPhase2_Input}
                multiStepPhase3_Input={multiStepPhase3_Input}
                setMultiStepPhase3_Input={setMultiStepPhase3_Input}
                multiStepPhase4_Input={multiStepPhase4_Input}
                setMultiStepPhase4_Input={setMultiStepPhase4_Input}
                multiStepPhase5_Input={multiStepPhase5_Input}
                setMultiStepPhase5_Input={setMultiStepPhase5_Input}
                multiStepPhase6_Input={multiStepPhase6_Input}
                setMultiStepPhase6_Input={setMultiStepPhase6_Input}
                multiStepPhase7_Input={multiStepPhase7_Input}
                setMultiStepPhase7_Input={setMultiStepPhase7_Input}
                multiStepPhase8_Input={multiStepPhase8_Input}
                setMultiStepPhase8_Input={setMultiStepPhase8_Input}
                multiStepPhase9_Input={multiStepPhase9_Input}
                setMultiStepPhase9_Input={setMultiStepPhase9_Input}
                setMultiStepPhase1_Output={setMultiStepPhase1_Output}
                setMultiStepPhase2_Output={setMultiStepPhase2_Output}
                setMultiStepPhase3_Output={setMultiStepPhase3_Output}
                setMultiStepPhase4_Output={setMultiStepPhase4_Output}
                setMultiStepPhase5_Output={setMultiStepPhase5_Output}
                setMultiStepPhase6_Output={setMultiStepPhase6_Output}
                setMultiStepPhase7_Output={setMultiStepPhase7_Output}
                setMultiStepPhase8_Output={setMultiStepPhase8_Output}
                setMultiStepPhase9_Output={setMultiStepPhase9_Output}
              />
            )}

            {activeTab === 'execution' && (
              <ExecutionTab
                isExecutingScript={isExecutingScript}
                multiStepPhase9_Output={multiStepPhase9_Output}
                isLlmTimerRunning={isLlmTimerRunning}
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
