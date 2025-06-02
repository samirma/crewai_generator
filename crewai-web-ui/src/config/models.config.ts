export interface ModelConfig {
  id: string;
  name: string;
  // Add other properties like 'host' or 'url' if needed in the future
}

export const staticModels: ModelConfig[] = [
  // DeepSeek Models
  { id: "deepseek/deepseek-chat", name: "deepseek-chat" },
  { id: "deepseek/deepseek-coder", name: "deepseek-coder" },

  // Gemini Models
  // Using the exact model IDs the GoogleGenerativeAI SDK expects.
  // Names are made more human-readable.
  {
    id: "gemini-2.5-flash-preview-05-20", // Actual ID for API
    name: "Gemini 2.5 Flash Preview 05-20" // Human-readable name
  },
];
