import { NextResponse } from 'next/server';
// Import ModelConfig and staticModels from the new configuration file
import { ModelConfig, staticModels } from '../../../config/models.config';

// Use ModelConfig directly or alias it. Let's use it directly for clarity.
// The previous Model interface was: interface Model { id: string; name: string; }
// ModelConfig is { id: string; name: string; }, so it's compatible.

export async function GET() {
  // Initialize with static models from the configuration file
  let allModels: ModelConfig[] = [...staticModels];

  // Ollama Models (fetched via API) - This part remains largely the same
  const ollamaApiBaseUrl = process.env.OLLAMA_API_BASE_URL;
  if (ollamaApiBaseUrl) {
    try {
      const response = await fetch(`${ollamaApiBaseUrl}/api/tags`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          const ollamaFetchedModels: ModelConfig[] = data.models.map((model: any) => {
            return {
              id: `ollama/${model.name}`, // Prefix with ollama/ to namespace
              name: `Ollama ${model.name}`
            };
          });
          allModels = [...allModels, ...ollamaFetchedModels];
        } else {
          console.warn("Ollama API response was OK, but data.models was not as expected:", data);
        }
      } else {
        console.warn(`Failed to fetch Ollama models. Status: ${response.status}, Body: ${await response.text()}`);
        // Add specific error model entry if fetch was not ok
        allModels.push({ id: "ollama/error", name: "Ollama (API Error - Check Connection/URL)" });
      }
    } catch (error: any) {
      console.error("Error fetching Ollama models:", error.message, error.stack);
      // Add specific error model entry if any other error occurred during fetch
      allModels.push({ id: "ollama/error", name: "Ollama (API Error - Check Connection/URL)" });
    }
  } else {
    // Optionally, add a placeholder if OLLAMA_API_BASE_URL is not set
    console.warn("OLLAMA_API_BASE_URL environment variable is not defined. Ollama models will not be fetched.");
    allModels.push({ id: "ollama/not-configured", name: "Ollama (Not Configured)" });
  }

  // Remove duplicates by ID
  const uniqueModels = new Map<string, ModelConfig>();
  allModels.forEach(model => {
    if (!uniqueModels.has(model.id)) {
      uniqueModels.set(model.id, model);
    }
  });
  allModels = Array.from(uniqueModels.values());

  // Sort models by name for consistent display
  allModels.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(allModels);
}
