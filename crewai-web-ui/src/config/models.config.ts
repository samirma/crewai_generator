export interface ModelConfig {
  id: string;
  name: string;
  // Add other properties like 'host' or 'url' if needed in the future
}

export const staticModels: ModelConfig[] = [
  // DeepSeek Models
  { id: "deepseek/deepseek-chat", name: "deepseek-chat" },
  { id: "deepseek/deepseek-reasoner", name: "deepseek-reasoner" },

  // Gemini Models
  // Using the exact model IDs the GoogleGenerativeAI SDK expects.
  // Names are made more human-readable.
  {
    id: "gemini-2.5-flash-preview-05-20", // Actual ID for API
    name: "Gemini 2.5 Flash Preview 05-20" // Human-readable name
  },
];

export async function getOllamaModels(): Promise<ModelConfig[]> {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (!response.ok) {
      console.error("Failed to fetch Ollama models:", response.statusText);
      return [];
    }
    const data = await response.json();
    if (!data.models || !Array.isArray(data.models)) {
      console.error("Unexpected Ollama API response structure:", data);
      return [];
    }
    return data.models.map((model: any) => ({
      id: `ollama/${model.name}`,
      name: model.name, // Consider removing :latest or other tags here if needed
    }));
  } catch (error) {
    console.error("Error fetching Ollama models:", error);
    return [];
  }
}

export async function getAllModels(): Promise<ModelConfig[]> {
  const ollamaModels = await getOllamaModels();
  return [...staticModels, ...ollamaModels];
}
