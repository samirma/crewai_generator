export interface ModelConfig {
  id: string;
  model: string;
  name: string;
  timeout: number;
  apiKey: string;
  baseURL: string;
  maxOutputTokens?: number;
}

export const staticModels: ModelConfig[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    model: "gemini-2.5-flash",
    timeout: 600,
    apiKey: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
  },
  {
    id: "qwen-3-235b-a22b-instruct",
    name: "Qwen 3 235B Instruct",
    model: "qwen-3-235b-a22b-instruct-2507",
    timeout: 600,
    apiKey: "CEREBRAS_API_KEY",
    baseURL: "https://api.cerebras.ai/v1",
  },
  {
    id: "deepseek_chat_worker",
    name: "Deepseek Chat Worker",
    model: "deepseek-chat",
    timeout: 600,
    apiKey: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com/v1",
    maxOutputTokens: 8000,
  },
];

export async function getAllModels(): Promise<ModelConfig[]> {
  let ollamaModels: ModelConfig[] = [];
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      ollamaModels = data.models.map((model: any) => ({
        id: model.name, // Use the model name as the ID
        name: `(Ollama) ${model.name}`,
        model: model.name,
        timeout: 600, // Default timeout
        apiKey: 'OLLAMA_API_KEY', // Placeholder/convention
        baseURL: 'http://localhost:11434/v1', // Ollama provides an OpenAI-compatible endpoint at /v1
      }));
    }
  } catch (error) {
    // Silently fail or log if Ollama is not running/reachable, so we don't break the app
    console.warn('Failed to fetch Ollama models:', error);
  }

  let localModels: ModelConfig[] = [];
  try {
    const response = await fetch('http://localhost:8080/v1/models');
    if (response.ok) {
      const data = await response.json();
      // data.data is the standard OpenAI format list
      localModels = (data.data || data).map((model: any) => ({
        id: model.id,
        name: `(Local) ${model.id}`,
        model: model.id,
        timeout: 600,
        apiKey: 'LOCAL_API_KEY', // Placeholder
        baseURL: 'http://localhost:8080/v1',
      }));
    }
  } catch (error) {
    console.warn('Failed to fetch Local models:', error);
  }

  return [...staticModels, ...ollamaModels, ...localModels];
}
