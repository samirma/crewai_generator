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
    id: "moonshotai_kimi-k2.5",
    name: "Nvidia - MoonshotAI Kimi K2.5",
    model: "moonshotai/kimi-k2.5",
    timeout: 600,
    apiKey: "NVIDIA_API_KEY",
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  // Bailian/Alibaba Models
  {
    id: "qwen3.5-plus",
    name: "(Alibaba) Qwen 3.5 Plus",
    model: "qwen3.5-plus",
    timeout: 600,
    apiKey: "ALIBABA",
    baseURL: "https://coding-intl.dashscope.aliyuncs.com/v1",
    maxOutputTokens: 8192,
  },
  {
    id: "qwen3-max-2026-01-23",
    name: "(Alibaba) Qwen 3 Max 2026-01-23",
    model: "qwen3-max-2026-01-23",
    timeout: 600,
    apiKey: "ALIBABA",
    baseURL: "https://coding-intl.dashscope.aliyuncs.com/v1",
  },
  {
    id: "MiniMax-M2.5",
    name: "(Alibaba) MiniMax M2.5",
    model: "MiniMax-M2.5",
    timeout: 600,
    apiKey: "ALIBABA",
    baseURL: "https://coding-intl.dashscope.aliyuncs.com/v1",
    maxOutputTokens: 8192,
  },
  {
    id: "glm-5",
    name: "(Alibaba) GLM-5",
    model: "glm-5",
    timeout: 600,
    apiKey: "ALIBABA",
    baseURL: "https://coding-intl.dashscope.aliyuncs.com/v1",
    maxOutputTokens: 8192,
  },
  {
    id: "kimi-k2.5",
    name: "(Alibaba) Kimi K2.5",
    model: "kimi-k2.5",
    timeout: 600,
    apiKey: "ALIBABA",
    baseURL: "https://coding-intl.dashscope.aliyuncs.com/v1",
    maxOutputTokens: 8192,
  },
];

export interface LocalServerConfig {
  id: string; // Unique identifier for the server (e.g., 'local', 'vllm')
  name: string; // Display name prefix
  baseURL: string;
  apiKey?: string;
  timeout?: number;
}

export const localServerConfigs: LocalServerConfig[] = [
  {
    id: 'kimi-local-wrapper',
    name: 'Kimi Local Wrapper',
    baseURL: 'http://localhost:3050/v1',
    apiKey: 'KIMI_API_KEY',
    timeout: 600,
  },
  {
    id: 'local',
    name: 'Local',
    baseURL: 'http://localhost:8001/v1',
    apiKey: 'LOCAL_API_KEY',
    timeout: 600,
  },
  {
    id: 'ml-studio',
    name: 'ML Studio',
    baseURL: 'http://localhost:1234/v1',
    apiKey: 'LOCAL_API_KEY',
    timeout: 600,
  },
  // Note: Individual Bailian models are defined in staticModels above
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

  const localModelsPromises = localServerConfigs.map(async (server) => {
    try {
      const response = await fetch(`${server.baseURL}/models`);
      if (response.ok) {
        const data = await response.json();
        // data.data is the standard OpenAI format list
        const models = (data.data || data).map((model: any) => ({
          id: `${server.id}_${model.id}`,
          name: `(${server.name}) ${model.id}`,
          model: model.id,
          timeout: server.timeout || 600,
          apiKey: server.apiKey || 'LOCAL_API_KEY',
          baseURL: server.baseURL,
        }));
        return models;
      }
    } catch (error) {
      console.warn(`Failed to fetch models from ${server.name} (${server.baseURL}):`, error);
    }
    return [];
  });

  const localModelsArrays = await Promise.all(localModelsPromises);
  const localModels = localModelsArrays.flat();

  return [...staticModels, ...ollamaModels, ...localModels];
}

export async function getModelConfig(modelId: string): Promise<ModelConfig | undefined> {
  // 1. Check static models first
  const staticModel = staticModels.find(m => m.id === modelId);
  if (staticModel) return staticModel;

  // 2. Check for Local Server models (prefix match)
  // Format: {server.id}_{model.id}
  for (const server of localServerConfigs) {
    if (modelId.startsWith(`${server.id}_`)) {
      const actualModelId = modelId.slice(server.id.length + 1);
      return {
        id: modelId,
        name: `(${server.name}) ${actualModelId}`,
        model: actualModelId,
        timeout: server.timeout || 600,
        apiKey: server.apiKey || 'LOCAL_API_KEY',
        baseURL: server.baseURL,
      };
    }
  }

  // 3. Fallback: Assume it's an Ollama model if we haven't found it yet
  // If the ID was fetched from Ollama, it's just the model name.
  // We don't have a reliable prefix for Ollama models from the list logic above (it just uses model.name).
  // But since we checked static and local prefixes, if it's not those, it's likely Ollama or an invalid ID.
  // We can treat it as an Ollama model.
  return {
    id: modelId,
    name: `(Ollama) ${modelId}`,
    model: modelId,
    timeout: 600,
    apiKey: 'OLLAMA_API_KEY',
    baseURL: 'http://localhost:11434/v1',
  };
}
