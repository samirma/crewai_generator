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
    id: "gemini-3-pro-preview",
    name: "Gemini 3",
    model: "gemini-3-pro-preview",
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
  },
  {
    id: "minimax-m2",
    name: "Minimax M2",
    model: "MiniMax-M2",
    timeout: 600,
    apiKey: "MINIMAX_API_KEY",
    baseURL: "https://api.minimax.io/v1",
  },
];

export async function getAllModels(): Promise<ModelConfig[]> {
  return [...staticModels];
}
