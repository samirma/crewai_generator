"use client"; // Required for Next.js App Router to use client-side features like useState

import { useState, useEffect } from 'react';

export default function Home() {
  const [initialInput, setInitialInput] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("gemini"); // Default LLM
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [executionOutput, setExecutionOutput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    setGeneratedScript("");
    setExecutionOutput("");

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
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-8 text-center">CrewAI Web Interface</h1>

      <div className="mb-6">
        <label htmlFor="initialInstruction" className="block text-lg font-medium mb-2">
          Initial Instruction Input
        </label>
        <textarea
          id="initialInstruction"
          name="initialInstruction"
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter your initial instructions here..."
          value={initialInput}
          onChange={(e) => setInitialInput(e.target.value)}
          disabled={isLoading}
        ></textarea>
      </div>

      <div className="mb-6">
        <label htmlFor="llmModelSelect" className="block text-lg font-medium mb-2">
          LLM Model Selection
        </label>
        <select
          id="llmModelSelect"
          name="llmModelSelect"
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          value={llmModel}
          onChange={(e) => setLlmModel(e.target.value)}
          disabled={isLoading}
        >
          <option value="gemini">Gemini</option>
          <option value="chatgpt">ChatGPT</option>
          <option value="deepseek">DeepSeek</option>
          <option value="ollama/llama2">Ollama Llama2</option>
          {/* Add more models as needed */}
        </select>
      </div>

      <div className="mb-6">
        <button
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Run'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 border border-red-400 bg-red-100 text-red-700 rounded-md">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="generatedScript" className="block text-lg font-medium mb-2">
          Generated Python Script
        </label>
        <pre
          id="generatedScript"
          className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 overflow-auto whitespace-pre-wrap min-h-[150px]"
        >
          {generatedScript || "Python script output will appear here"}
        </pre>
      </div>

      <div>
        <label htmlFor="scriptOutput" className="block text-lg font-medium mb-2">
          Script Execution Output
        </label>
        <pre
          id="scriptOutput"
          className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 overflow-auto whitespace-pre-wrap min-h-[150px]"
        >
          {executionOutput || "Script execution output will appear here"}
        </pre>
      </div>
    </main>
  );
}
