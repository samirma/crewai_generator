export interface ModelConfig {
  id: string;
  name: string;
  maxOutputTokens?: number; // Added this line
  // Add other properties like 'host' or 'url' if needed in the future
}

export const staticModels: ModelConfig[] = [
  // DeepSeek Models
  { id: "deepseek/deepseek-chat", name: "deepseek-chat", maxOutputTokens: 8000 },
  { id: "deepseek/deepseek-reasoner", name: "deepseek-reasoner", maxOutputTokens: 64000 },

  // Gemini Models
  // Using the exact model IDs the GoogleGenerativeAI SDK expects.
  // Names are made more human-readable.
  {
    id: "gemini-2.5-flash", // Actual ID for API
    name: "Gemini 2.5 Flash", // Human-readable name
  },
  {
    id: "gemini-2.5-pro", // Actual ID for API
    name: "Gemini 2.5 Pro", // Human-readable name
  }

];

interface OllamaModelFromApi {
  name: string;
  modified_at: string;
  size: number;
  // Add other properties if known, otherwise keep it minimal
}

export async function getOllamaModels(): Promise<ModelConfig[]> {
  // Define fetchUrl here so it's accessible in the catch block for logging
  let fetchUrl = '';
  try {
    const baseUrl = process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434';
    fetchUrl = `${baseUrl.replace(/\/$/, '')}/api/tags`; // Ensure no double slashes if baseUrl ends with /
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.error("Failed to fetch Ollama models:", response.statusText, `(URL: ${fetchUrl})`);
      return [];
    }
    const data = await response.json();
    if (!data.models || !Array.isArray(data.models)) {
      console.error("Unexpected Ollama API response structure:", data, `(URL: ${fetchUrl})`);
      return [];
    }
    return data.models.map((model: OllamaModelFromApi) => {
      const modelConfig: ModelConfig = { // Explicitly type here for clarity
        id: `ollama/${model.name}`,
        name: model.name,
      };
      if (model.name.toLowerCase().includes("llama")) {
        modelConfig.maxOutputTokens = 65536;
      }
      return modelConfig;
    });
  } catch (error) {
    // Now fetchUrl is accessible here
    console.error("Error fetching Ollama models:", error, fetchUrl ? `(Attempted URL: ${fetchUrl})` : "(URL not determined)");
    return [];
  }
}

export async function getAllModels(): Promise<ModelConfig[]> {
  // const ollamaModels = await getOllamaModels();
  return [...staticModels];
}
