"use client"; // Required for Next.js App Router to use client-side features like useState

import { useState, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
}

interface PhasedOutput {
  taskName: string;
  output: string;
}

export default function Home() {
  const [initialInput, setInitialInput] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>(""); // Will be set after fetching models
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [executionOutput, setExecutionOutput] = useState<string>("");
  const [scriptRunOutput, setScriptRunOutput] = useState<string>(""); // New state for direct script execution
  const [isExecutingScript, setIsExecutingScript] = useState<boolean>(false); // New state for "Run Script" button loading
  const [scriptExecutionError, setScriptExecutionError] = useState<string>(""); // New state for direct script execution errors
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [modelsError, setModelsError] = useState<string>("");
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [phasedOutputs, setPhasedOutputs] = useState<PhasedOutput[]>([]);

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

  const handleSubmit = async () => {
    if (!llmModel) {
      setError("Please select an LLM model.");
      return;
    }
    setIsLoading(true);
    setError("");
    setGeneratedScript("");
    setExecutionOutput("");
    setPhasedOutputs([]); // Clear previous phased outputs

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initialInput, llmModel }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setGeneratedScript(data.generatedScript);
      setExecutionOutput(data.executionOutput);
      if (data.phasedOutputs) {
        setPhasedOutputs(data.phasedOutputs);
      }

    } catch (err) {
      console.error("Error calling API:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while fetching data.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteScript = async () => {
    if (!generatedScript) {
      setScriptExecutionError("No script to execute.");
      return;
    }
    setIsExecutingScript(true);
    setScriptExecutionError("");
    setScriptRunOutput("");

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: generatedScript }), // Send generatedScript as "script"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setScriptRunOutput(data.output); // Assuming the API returns { output: "..." }
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

  return (
    <main className="container mx-auto p-6 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center text-slate-700 dark:text-slate-200">CrewAI Studio</h1>

      <div className="mb-8">
        <label htmlFor="initialInstruction" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
          Initial Instruction Input
        </label>
        <textarea
          id="initialInstruction"
          name="initialInstruction"
          rows={4}
          className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 dark:hover:border-slate-500"
          placeholder="Enter your initial instructions here..."
          value={initialInput}
          onChange={(e) => setInitialInput(e.target.value)}
          disabled={isLoading}
        ></textarea>
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
          disabled={isLoading || modelsLoading || modelsError !== ""}
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
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:focus:ring-blue-800"
          onClick={handleSubmit}
          disabled={isLoading || modelsLoading || !llmModel}
        >
          {isLoading ? 'Generating...' : (modelsLoading ? 'Loading models...' : 'Run')}
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {scriptExecutionError && (
        <div className="mb-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
          <p className="font-semibold">Script Execution Error:</p>
          <p>{scriptExecutionError}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <label htmlFor="scriptOutput" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
            Script Execution Output
          </label>
          <pre
            id="scriptOutput"
            className="w-full p-4 border border-slate-200 rounded-md bg-slate-50 shadow-sm overflow-auto whitespace-pre-wrap min-h-[160px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          >
            {scriptRunOutput || "Script execution output will appear here"}
          </pre>
        </div>
        <div>
          <label htmlFor="generatedScript" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
            Generated Python Script
          </label>
          <pre
            id="generatedScript"
            className="w-full p-4 border border-slate-200 rounded-md bg-slate-50 shadow-sm overflow-auto whitespace-pre-wrap min-h-[160px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          >
            {generatedScript || "Python script output will appear here"}
          </pre>
          <button
            type="button"
            onClick={handleExecuteScript}
            disabled={!generatedScript || isExecutingScript}
            className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 focus:ring-4 focus:ring-green-300 focus:outline-none dark:focus:ring-green-800"
          >
            {isExecutingScript ? 'Executing Script...' : 'Run Script'}
          </button>
        </div>
      </div>
    </main>
  );
}
