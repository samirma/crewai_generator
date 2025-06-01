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
            // Prioritize "gemini-pro", then first selectable model
            const geminiProModel = selectableModels.find(model => model.id === "gemini-pro");
            if (geminiProModel) {
              setLlmModel(geminiProModel.id);
            } else {
              setLlmModel(selectableModels[0].id);
            }
          } else {
            // If no selectable models, set llmModel to empty or handle accordingly
            setLlmModel("");
          }
        } else {
          setLlmModel(""); // No models available
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
    <main className="container mx-auto p-6 md:p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-10 text-center text-slate-700">CrewAI Web Interface</h1>

      <div className="input-section mb-6"> {/* Using custom class from globals.css for consistent spacing if needed, or just mb-6 */}
        <label htmlFor="initialInstruction" className="block text-md font-semibold mb-2 text-slate-600">
          Initial Instruction Input
        </label>
        <textarea
          id="initialInstruction"
          name="initialInstruction"
          rows={4}
          className="w-full" /* Tailwind classes removed as global styles will apply. Added bg-white for explicit background. */
          placeholder="Enter your initial instructions here..."
          value={initialInput}
          onChange={(e) => setInitialInput(e.target.value)}
          disabled={isLoading}
        ></textarea>
      </div>

      <div className="input-section mb-6">
        <label htmlFor="llmModelSelect" className="block text-md font-semibold mb-2 text-slate-600">
          LLM Model Selection
        </label>
        <select
          id="llmModelSelect"
          name="llmModelSelect"
          className="w-full" /* Tailwind classes removed, bg-white for explicit background */
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
        {modelsError && <p className="text-sm text-red-600 mt-1">{modelsError}</p>}
      </div>

      <div className="mb-6">
        <button
          type="button"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-3 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          onClick={handleSubmit}
          disabled={isLoading || modelsLoading || !llmModel}
        >
          {isLoading ? 'Generating...' : (modelsLoading ? 'Loading models...' : 'Run')}
        </button>
      </div>

      <div className="mb-6 flex items-center p-3 border border-slate-200 rounded-lg shadow-sm bg-white">
        <input
          type="checkbox"
          id="advancedModeToggle"
          checked={advancedMode}
          onChange={(e) => setAdvancedMode(e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-3"
        />
        <label htmlFor="advancedModeToggle" className="block text-sm font-medium text-slate-700 select-none">
          Advanced/Developer Mode (Show Phased Outputs)
        </label>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-400 bg-red-100 text-red-700 rounded-md shadow"> {/* Slightly more padding and shadow */}
          <p className="font-bold text-lg mb-1">Error:</p> {/* Made "Error:" more prominent */}
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6 p-4 border border-slate-200 rounded-lg shadow-sm bg-white">
        <label htmlFor="generatedScript" className="block text-md font-semibold mb-2 text-slate-600">
          Generated Python Script
        </label>
        <pre id="generatedScript" className="w-full min-h-[150px]"> {/* Global pre style applies */}
          {generatedScript || "Python script output will appear here"}
        </pre>
      </div>

      <div className="mb-6 p-4 border border-slate-200 rounded-lg shadow-sm bg-white"> {/* Added mb-6 for spacing before phased output */}
        <label htmlFor="scriptOutput" className="block text-md font-semibold mb-2 text-slate-600">
          Script Execution Output
        </label>
        <pre id="scriptOutput" className="w-full min-h-[150px]"> {/* Global pre style applies */}
          {executionOutput || "Script execution output will appear here"}
        </pre>
      </div>

      {advancedMode && phasedOutputs.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-300">
          <h2 className="text-xl font-semibold mb-4 text-slate-700">Phased Task Outputs:</h2>
          {phasedOutputs.map((phase, index) => (
            <div key={index} className="mb-6 p-4 border border-slate-200 rounded-lg shadow bg-slate-50">
              <h3 className="text-lg font-medium text-slate-600 mb-2">Task: {phase.taskName}</h3>
              <pre className="w-full min-h-[100px]"> {/* Global pre style applies */}
                {phase.output || "No output for this phase."}
              </pre>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
