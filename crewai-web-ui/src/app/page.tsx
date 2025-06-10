"use client"; // Required for Next.js App Router to use client-side features like useState

import { useState, useEffect } from 'react';
import CopyButton from './components/CopyButton';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Model {
  id: string;
  name: string;
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
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [executionOutput, setExecutionOutput] = useState<string>(""); // Used for simple mode's docker output
  const [scriptRunOutput, setScriptRunOutput] = useState<string>(""); // For "Run Script" button (Phase 3 or simple mode)
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
  const [defaultPhase1PromptText, setDefaultPhase1PromptText] = useState<string>("");
  const [defaultPhase2PromptText, setDefaultPhase2PromptText] = useState<string>("");
  const [defaultPhase3PromptText, setDefaultPhase3PromptText] = useState<string>("");

  useEffect(() => {
    // Load initialInput from cookie on component mount using helper
    const cookieValue = getCookie('initialInstruction');
    if (cookieValue) {
      setInitialInput(cookieValue);
    }
  }, []); // Empty dependency array ensures this runs only on mount

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

  const resetOutputStates = () => {
    setError("");
    setGeneratedScript("");
    setExecutionOutput("");
    setPhasedOutputs([]);
    setScriptRunOutput("");
    setDisplayedPrompt("");
    setScriptExecutionError("");
    setModelsError("");
    setRawLlmResult("");
    setActualLlmInputPrompt("");
    setActualLlmOutputPrompt("");
  };

  const handleSimpleModeSubmit = async () => {
    setCookie('initialInstruction', initialInput, 30); // Save cookie on generation trigger
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    setIsLoading(true); // General loading for simple mode
    resetOutputStates();

    const phaseTexts = [defaultPhase1PromptText, defaultPhase2PromptText, defaultPhase3PromptText].filter(text => text); // Filter out any empty/undefined prompts
    const fullPrompt = constructFrontendPrompt('simple', initialInput, phaseTexts);
    setDisplayedPrompt(fullPrompt);

    console.log("Generating simple mode script using combined prompts.");

    const payload = {
      llmModel,
      mode: 'simple',
      fullPrompt: fullPrompt,
    };

    await executeGenerateRequest(
      '/api/generate',
      payload,
      (data) => {
        setGeneratedScript(data.generatedScript);
        setPhasedOutputs(data.phasedOutputs || []);
        // setDisplayedPrompt(data.fullPrompt || ""); // Already set by frontend
        setExecutionOutput(""); // Clear previous execution outputs
        setScriptRunOutput(""); // Clear previous script run outputs
      },
      (errorMessage) => {
        setError(errorMessage);
      },
      () => {
        setIsLoading(false);
      }
    );
  };

  const handleRunPhase = async (phase: number) => {
    setCookie('initialInstruction', initialInput, 30); // Save cookie on generation trigger
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    setIsLoadingPhase(prev => ({ ...prev, [phase]: true }));
    setCurrentPhaseRunning(phase);
    resetOutputStates(); // Reset common outputs and errors

    // Clear subsequent phase-specific outputs
    if (phase === 1) {
      setPhase1Output("");
      setPhase2Output("");
      // setGeneratedScript(""); // Handled by resetOutputStates
    } else if (phase === 2) {
      setPhase2Output("");
      // setGeneratedScript(""); // Handled by resetOutputStates
    } else if (phase === 3) {
      // setGeneratedScript(""); // Handled by resetOutputStates
    }
    // setScriptRunOutput(""), setExecutionOutput(""), setPhasedOutputs([]) are handled by resetOutputStates()

    const phaseTextsForPrompt: string[] = [];
    const currentPhase1Text = phase1Prompt;
    const currentPhase2Text = phase2Prompt;
    const currentPhase3Text = phase3Prompt;

    if (phase === 1) {
      if (currentPhase1Text) phaseTextsForPrompt.push(currentPhase1Text);
    } else if (phase === 2) {
      if (currentPhase1Text) phaseTextsForPrompt.push(currentPhase1Text);
      if (currentPhase2Text) phaseTextsForPrompt.push(currentPhase2Text);
    } else if (phase === 3) {
      if (currentPhase1Text) phaseTextsForPrompt.push(currentPhase1Text);
      if (currentPhase2Text) phaseTextsForPrompt.push(currentPhase2Text);
      if (currentPhase3Text) phaseTextsForPrompt.push(currentPhase3Text);
    }

    const fullPrompt = constructFrontendPrompt('advanced', initialInput, phaseTextsForPrompt);
    setDisplayedPrompt(fullPrompt);

    let payload: any = {
      llmModel,
      mode: 'advanced',
      runPhase: phase,
      fullPrompt: fullPrompt, // Send the fully constructed prompt
    };

    // Old console.log statements for specific phase generation have been removed.
    // The backend now handles detailed logging based on source indicators.
    // Removed old payload construction that sent individual prompts and source indicators.

    await executeGenerateRequest(
      '/api/generate',
      payload,
      (data) => {
        // setDisplayedPrompt(data.fullPrompt || ""); // Already set by frontend
        if (phase === 1) {
          setPhase1Output(data.output);
        } else if (phase === 2) {
          setPhase2Output(data.output);
        } else if (phase === 3) {
          setGeneratedScript(data.generatedScript);
          setPhase3GeneratedTaskOutputs(data.phasedOutputs || []);
          // setPhasedOutputs(data.phasedOutputs || []); // Removed as per requirement
          // executionOutput and scriptRunOutput are already cleared by resetOutputStates
          // and should only be set after script execution, not after phase 3 generation.
        }
      },
      (errorMessage) => {
        setError(errorMessage);
      },
      () => {
        setIsLoadingPhase(prev => ({ ...prev, [phase]: false }));
        setCurrentPhaseRunning(null);
      }
    );
  };


  const handleExecuteScript = async () => {
    if (!generatedScript) {
      setScriptExecutionError("No script to execute.");
      return;
    }
    setIsExecutingScript(true);
    setScriptExecutionError("");
    setScriptLogOutput([]);
    setDockerCommandToDisplay(""); // Reset Docker command display
    setScriptRunOutput("");
    setPhasedOutputs([]);
    setExecutionOutput("");

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: generatedScript }),
      });

      if (!response.ok) {
        let errorText = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch (e) {
          // Ignore if response is not JSON
        }
        throw new Error(errorText);
      }

      if (!response.body) {
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
              const finalResult = JSON.parse(line.substring("RESULT: ".length));
              let summary = `Overall Status: ${finalResult.overallStatus}\n`;
              if (finalResult.mainScript) {
                summary += `Stdout:\n${finalResult.mainScript.stdout || ""}\n`;
                summary += `Stderr:\n${finalResult.mainScript.stderr || ""}\n`;
              }
              if (finalResult.error) {
                summary += `Error: ${finalResult.error}\n`;
              }
              setScriptRunOutput(summary);

              if (finalResult.mainScript && finalResult.mainScript.stdout) {
                const taskOutputs = parsePhasedOutputs(finalResult.mainScript.stdout);
                setPhasedOutputs(taskOutputs);
              }

              if (finalResult.overallStatus === 'failure') {
                let errorMsg = "Script execution failed.";
                if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
                setScriptExecutionError(errorMsg);
              }
            } catch (e) {
              console.error("Error parsing final result JSON:", e);
              setScriptExecutionError("Error parsing final result from script execution.");
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
              const finalResult = JSON.parse(buffer.substring("RESULT: ".length));
              let summary = `Overall Status: ${finalResult.overallStatus}\n`;
              if (finalResult.mainScript) {
                summary += `Stdout:\n${finalResult.mainScript.stdout || ""}\n`;
                summary += `Stderr:\n${finalResult.mainScript.stderr || ""}\n`;
              }
              if (finalResult.error) {
                summary += `Error: ${finalResult.error}\n`;
              }
              setScriptRunOutput(summary);

              if (finalResult.mainScript && finalResult.mainScript.stdout) {
                const taskOutputs = parsePhasedOutputs(finalResult.mainScript.stdout);
                setPhasedOutputs(taskOutputs);
              }

              if (finalResult.overallStatus === 'failure') {
                let errorMsg = "Script execution failed.";
                if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
                setScriptExecutionError(errorMsg);
              }
            } catch (e) {
              console.error("Error parsing final result JSON from remaining buffer:", e);
              setScriptExecutionError("Error parsing final result from script execution (buffer).");
            }
      }

    } catch (err) {
      console.error("Error executing script:", err);
      if (err instanceof Error) {
        setScriptExecutionError(err.message);
      } else {
        setScriptExecutionError("An unknown error occurred while executing the script.");
      }
    } finally {
      setIsExecutingScript(false);
    }
  };

  const constructFrontendPrompt = (mode: string, userInput: string, phaseTexts: string[]): string => {
    let fullPrompt = phaseTexts.join("\n\n");
    fullPrompt += `\n\nUser Instruction: @@@${userInput}@@@`;

    if (mode === 'simple') {
      fullPrompt += `\n\nGenerate the Python script for CrewAI based on this. Ensure each task's output is clearly marked with '### CREWAI_TASK_OUTPUT_MARKER: <task_name> ###' on a new line, followed by the task's output on subsequent lines.`;
    }
    return fullPrompt;
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
      onSuccess(data);
    } catch (err) {
      console.error("API Request Error:", err);
      onError(err instanceof Error ? err.message : "An unknown API error occurred.");
    } finally {
      if (onFinally) {
        onFinally();
      }
    }
  };

  return (
    <main className="container mx-auto p-6 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center text-slate-700 dark:text-slate-200">CrewAI Studio</h1>

      {/* Mode Toggle */}
      <div className="mb-8 flex items-center justify-center space-x-4">
        <label htmlFor="modeToggle" className="text-base font-medium text-slate-700 dark:text-slate-300">
          Simple Mode
        </label>
        <div
          className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-300 ease-in-out ${advancedMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          onClick={() => {
            setAdvancedMode(!advancedMode);
            // Clear errors and outputs when toggling mode
            resetOutputStates();
            setPhase1Output("");
            setPhase2Output("");
            // Other states like generatedScript, executionOutput, etc., are covered by resetOutputStates
          }}
        >
          <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${advancedMode ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </div>
        <label htmlFor="modeToggle" className="text-base font-medium text-slate-700 dark:text-slate-300">
          Advanced Mode
        </label>
        <input type="checkbox" id="modeToggle" className="sr-only" checked={advancedMode} onChange={() => setAdvancedMode(!advancedMode)} />
      </div>


      <div className="mb-8">
        <label htmlFor="initialInstruction" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
          {advancedMode ? "Initial User Instruction (for Phase 1)" : "Initial Instruction Input"}
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
          disabled={isLoading || isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3]}
          ></textarea>
          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
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
          disabled={isLoading || modelsLoading || modelsError !== "" || isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3]}
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

      {!advancedMode && (
        <div className="mb-8">
          <button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:focus:ring-blue-800"
            onClick={handleSimpleModeSubmit}
            disabled={isLoading || modelsLoading || !llmModel}
          >
            {isLoading ? 'Generating (Simple Mode)...' : (modelsLoading ? 'Loading models...' : 'Run Simple Mode')}
          </button>
        </div>
      )}

      {advancedMode && (
        <div className="space-y-10">
          {/* Phase 1 */}
          <div className="p-6 border border-slate-300 dark:border-slate-700 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Phase 1: Define Blueprint</h2>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="phase1Prompt" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Phase 1 Prompt (Blueprint Definition)</label>
              <CopyButton textToCopy={phase1Prompt} />
            </div>
            <textarea
              id="phase1Prompt"
              value={phase1Prompt}
              onChange={(e) => setPhase1Prompt(e.target.value)}
              rows={8}
              className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500 mb-3"
              disabled={isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3]}
            />
            <button
              onClick={() => handleRunPhase(1)}
              disabled={isLoadingPhase[1] || modelsLoading || !llmModel || isLoadingPhase[2] || isLoadingPhase[3]}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:focus:ring-indigo-700 mt-3"
            >
              {isLoadingPhase[1] ? 'Running Phase 1...' : 'Run Phase 1 (Define Blueprint)'}
            </button>
            {phase1Output && (
              <div className="mt-4"> {/* Added a wrapper div for margin consistency */}
                <details>
                  <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                    <span>Phase 1 Output (Blueprint)</span>
                    <CopyButton textToCopy={phase1Output} />
                  </summary>
                  <pre
                    id="phase1Output" // id can remain for anchoring if needed, or be removed
                    className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2" // Added mt-2 for spacing from summary
                  >{phase1Output || "Blueprint output will appear here..."}</pre>
                </details>
              </div>
            )}
            {!phase1Output && ( // Fallback for when phase1Output is empty
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
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="phase2Prompt" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Phase 2 Prompt (Architecture Design)</label>
              <CopyButton textToCopy={phase2Prompt} />
            </div>
            <textarea
              id="phase2Prompt"
              value={phase2Prompt}
              onChange={(e) => setPhase2Prompt(e.target.value)}
              rows={8}
              className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500 mb-3"
              disabled={isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3]}
            />
            <button
              onClick={() => handleRunPhase(2)}
              disabled={isLoadingPhase[2] || modelsLoading || !llmModel || isLoadingPhase[1] || isLoadingPhase[3]}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:focus:ring-indigo-700 mt-3"
            >
              {isLoadingPhase[2] ? 'Running Phase 2...' : 'Run Phase 2 (Design Architecture)'}
            </button>
            {phase2Output && (
              <div className="mt-4"> {/* Added a wrapper div for margin consistency */}
                <details>
                  <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex justify-between items-center mb-1">
                    <span>Phase 2 Output (Architecture Plan)</span>
                    <CopyButton textToCopy={phase2Output} />
                  </summary>
                  <pre
                    id="phase2Output" // id can remain or be removed
                    className="w-full p-3 border border-slate-200 rounded-md bg-slate-50 shadow-inner overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 mt-2" // Added mt-2 for spacing
                  >{phase2Output || "Architecture plan output will appear here..."}</pre>
                </details>
              </div>
            )}
            {!phase2Output && ( // Fallback for when phase2Output is empty
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
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="phase3Prompt" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Phase 3 Prompt (Script Generation)</label>
              <CopyButton textToCopy={phase3Prompt} />
            </div>
            <textarea
              id="phase3Prompt"
              value={phase3Prompt}
              onChange={(e) => setPhase3Prompt(e.target.value)}
              rows={8}
              className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500 mb-3"
              disabled={isLoadingPhase[1] || isLoadingPhase[2] || isLoadingPhase[3]}
            />
            <button
              onClick={() => handleRunPhase(3)}
              disabled={isLoadingPhase[3] || modelsLoading || !llmModel || isLoadingPhase[1] || isLoadingPhase[2]}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition duration-150 ease-in-out disabled:opacity-60 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:focus:ring-indigo-700 mt-3"
            >
              {isLoadingPhase[3] ? 'Running Phase 3...' : 'Run Phase 3 (Generate & Execute Script)'}
            </button>
            
            {phase3GeneratedTaskOutputs && phase3GeneratedTaskOutputs.length > 0 && (
              <div className="mt-6">
                <label htmlFor="phase3GeneratedOutput" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Phase 3 Generation - Predicted Task Outputs</label>
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
            {/* Phase 3 output uses existing generatedScript and scriptRunOutput areas */}
          </div>
        </div>
      )}


      {error && (
        <div className="mt-8 mb-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {scriptExecutionError && (
        <div className="mt-8 mb-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
          <p className="font-semibold">Script Execution Error:</p>
          <p>{scriptExecutionError}</p>
        </div>
      )}

      {/* Output sections: Generated Script and Script Execution Output / Phased Outputs */}
      {/* These are shown for both simple mode and advanced mode (phase 3) */}
      {(generatedScript || scriptLogOutput.length > 0 || scriptRunOutput || phasedOutputs.length > 0) && (
         <div className="grid md:grid-cols-2 gap-6 mt-10 mb-8">
          <div>
            <label htmlFor="scriptExecutionArea" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
              {advancedMode && currentPhaseRunning === 3 ? "Phase 3 Script Execution Output" : (advancedMode ? "Script Execution Output (Phase 3)" : "Script Execution Output (Simple Mode)")}
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

              {/* Final Summary */}
              {scriptRunOutput && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300">
                      Final Summary:
                    </h3>
                    <CopyButton textToCopy={scriptRunOutput} />
                  </div>
                  <pre className="p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-inner overflow-auto whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                    {scriptRunOutput}
                  </pre>
                </div>
              )}

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
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="generatedScript" className="block text-base font-medium text-slate-700 dark:text-slate-300">
                {advancedMode && currentPhaseRunning === 3 ? "Phase 3 Generated Python Script" : (advancedMode ? "Generated Python Script (Phase 3)" : "Generated Python Script (Simple Mode)")}
              </label>
              <CopyButton textToCopy={generatedScript} />
            </div>
            <div className="w-full p-4 border border-slate-200 rounded-md bg-slate-800 shadow-sm overflow-auto min-h-[160px] dark:border-slate-700">
              <SyntaxHighlighter
                language="python"
                style={atomDark}
                showLineNumbers={true}
                wrapLines={true} // Wraps lines that exceed the width
                lineProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }} // Ensures lines wrap correctly
                customStyle={{
                  margin: 0, // Remove default margin from pre tag
                  backgroundColor: 'transparent', // Inherit background from parent div
                  height: 'auto', // Allow height to adjust to content or minHeight
                  minHeight: '140px', // Approximate original content area minus padding
                  overflow: 'auto', // Ensure scrolling if content overflows
                }}
                codeTagProps={{ style: { fontFamily: 'inherit' } }} // Use consistent font
              >
                {generatedScript || "# Python script output will appear here"}
              </SyntaxHighlighter>
            </div>
            <button
              type="button"
              onClick={handleExecuteScript}
              disabled={!generatedScript || isExecutingScript || (advancedMode && currentPhaseRunning !== null && currentPhaseRunning !== 3) }
              className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-green-300 focus:outline-none dark:focus:ring-green-800"
            >
              {isExecutingScript ? 'Executing Script...' : 'Run This Script (Locally via API)'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
