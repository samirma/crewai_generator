export interface ModelConfig {
  id: string;
  model: string;
  name: string;
  timeout: number;
  apiKey: string;
  baseURL: string;
  maxOutputTokens?: number;
  // 'chat' (default) = OpenAI-compatible chat.completions.
  // 'codex-responses' = ChatGPT Codex backend: Responses API, streaming-only,
  // OAuth access token in `apiKey` env var + ChatGPT-Account-Id header from `accountIdEnv`.
  apiType?: 'chat' | 'codex-responses';
  accountIdEnv?: string;
}

export const staticModels: ModelConfig[] = [
  // Nvidia-hosted models (integrate.api.nvidia.com)
  {
    id: "z-ai_glm-5.2",
    name: "Nvidia - Zai GLM 5.2",
    model: "z-ai/glm-5.2",
    timeout: 600,
    apiKey: "NVIDIA_API_KEY",
    baseURL: "https://integrate.api.nvidia.com/v1",
    maxOutputTokens: 16384,
  },
  // OpenAI via the ChatGPT Codex backend (OAuth access token from a ChatGPT
  // login, e.g. opencode's auth.json — NOT a platform API key).
  {
    id: "openai_gpt-5.6-terra",
    name: "OpenAI - GPT 5.6 Terra (ChatGPT)",
    model: "gpt-5.6-terra",
    timeout: 600,
    apiKey: "OPENAI_CHATGPT_ACCESS_TOKEN",
    baseURL: "https://chatgpt.com/backend-api/codex",
    apiType: "codex-responses",
    accountIdEnv: "OPENAI_CHATGPT_ACCOUNT_ID",
  },
  {
    id: "openai_gpt-5.6-luna",
    name: "OpenAI - GPT 5.6 Luna (ChatGPT)",
    model: "gpt-5.6-luna",
    timeout: 600,
    apiKey: "OPENAI_CHATGPT_ACCESS_TOKEN",
    baseURL: "https://chatgpt.com/backend-api/codex",
    apiType: "codex-responses",
    accountIdEnv: "OPENAI_CHATGPT_ACCOUNT_ID",
  },
];

const CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex";

function codexModelConfig(modelId: string): ModelConfig {
  return {
    id: `openai_${modelId}`,
    name: `OpenAI - ${modelId} (ChatGPT)`,
    model: modelId,
    timeout: 600,
    apiKey: "OPENAI_CHATGPT_ACCESS_TOKEN",
    baseURL: CODEX_BASE_URL,
    apiType: "codex-responses",
    accountIdEnv: "OPENAI_CHATGPT_ACCOUNT_ID",
  };
}

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

  // ChatGPT Codex backend: list available OpenAI models when OAuth env vars are
  // present. Fails silently (static entries remain) when absent or unsupported.
  let codexModels: ModelConfig[] = [];
  const codexToken = process.env.OPENAI_CHATGPT_ACCESS_TOKEN;
  const codexAccountId = process.env.OPENAI_CHATGPT_ACCOUNT_ID;
  if (codexToken && codexAccountId) {
    try {
      const response = await fetch(`${CODEX_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${codexToken}`,
          'ChatGPT-Account-Id': codexAccountId,
          'OpenAI-Beta': 'responses=experimental',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const list = data.data || data.models || data;
        if (Array.isArray(list)) {
          codexModels = list
            .map((m: any) => (typeof m === 'string' ? m : m.id || m.slug || m.model))
            .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
            .map(codexModelConfig);
        }
      } else {
        console.warn(`ChatGPT Codex model listing not available (HTTP ${response.status}).`);
      }
    } catch (error) {
      console.warn('Failed to fetch ChatGPT Codex models:', error);
    }
  }

  return [...staticModels, ...ollamaModels, ...localModels, ...codexModels];
}

export async function getModelConfig(modelId: string): Promise<ModelConfig | undefined> {
  // 1. Check static models first
  const staticModel = staticModels.find(m => m.id === modelId);
  if (staticModel) return staticModel;

  // 2. ChatGPT Codex models discovered at runtime (prefix openai_)
  if (modelId.startsWith('openai_')) {
    return codexModelConfig(modelId.slice('openai_'.length));
  }

  // 3. Check for Local Server models (prefix match)
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
