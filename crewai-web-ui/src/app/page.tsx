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
          const selectableModels = models.filter(model => model.id !== 'ollama/not-configured');

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

  return (
    <main className="container mx-auto p-6 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center text-slate-700 dark:text-slate-200">CrewAI Web Interface</h1>

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
              disabled={model.id === 'ollama/not-configured'}
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

      <div className="my-6 flex items-center">
        <input
          type="checkbox"
          id="advancedModeToggle"
          checked={advancedMode}
          onChange={(e) => setAdvancedMode(e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-slate-600 dark:focus:ring-indigo-600 dark:focus:ring-offset-gray-800 dark:bg-slate-700"
        />
        <label htmlFor="advancedModeToggle" className="ml-2 block text-sm text-slate-600 dark:text-slate-400">
          Advanced/Developer Mode (Show Phased Outputs)
        </label>
      </div>

      {error && (
        <div className="mb-8 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
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
        </div>

        <div>
          <label htmlFor="scriptOutput" className="block text-base font-medium mb-2 text-slate-700 dark:text-slate-300">
            Script Execution Output
          </label>
          <pre
            id="scriptOutput"
            className="w-full p-4 border border-slate-200 rounded-md bg-slate-50 shadow-sm overflow-auto whitespace-pre-wrap min-h-[160px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          >
            {executionOutput || "Script execution output will appear here"}
          </pre>
        </div>
      </div>

      {advancedMode && phasedOutputs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Phased Task Outputs:</h2>
          {phasedOutputs.map((phase, index) => (
            <div key={index} className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50 shadow dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">Task: {phase.taskName}</h3>
              <pre className="w-full p-3 border border-slate-300 rounded-md bg-slate-100 overflow-auto whitespace-pre-wrap min-h-[100px] dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300">
                {phase.output || "No output for this phase."}
              </pre>
              {/* New button and input section for phase interaction */}
              {advancedMode && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => console.log(`'Edit/Retry Phase' for '${phase.taskName}' clicked (not implemented)`)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
                    title="Feature not yet implemented"
                    // disabled // Using onClick for console log, but visually can be styled as disabled
                  >
                    Edit/Retry Phase
                  </button>
                  <button
                    type="button"
                    onClick={() => console.log(`'Select LLM for Phase' for '${phase.taskName}' clicked (not implemented)`)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
                    title="Feature not yet implemented"
                    // disabled
                  >
                    Select LLM for Phase
                  </button>
                  <input
                    type="text"
                    placeholder="Custom input for phase (not implemented)"
                    className="flex-grow p-1 text-xs border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200 sm:text-xs disabled:opacity-70"
                    disabled // Mark as disabled for now
                    title="Feature not yet implemented"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
