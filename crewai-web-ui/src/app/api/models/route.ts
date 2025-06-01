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
            const modelNameParts = model.name.split(':');
            const baseName = modelNameParts[0];
            const tag = modelNameParts[1] || 'latest';
            return {
              id: `ollama/${model.name}`, // Prefix with ollama/ to namespace
              name: `Ollama ${baseName.charAt(0).toUpperCase() + baseName.slice(1)} (${tag})`
            };
          });
          allModels = [...allModels, ...ollamaFetchedModels];
        } else {
          console.warn("Ollama API response was OK, but data.models was not as expected:", data);
        }
      } else {
        console.warn(`Failed to fetch Ollama models. Status: ${response.status}, Body: ${await response.text()}`);
      }
    } catch (error) {
      console.error("Error fetching Ollama models:", error);
    }
  } else {
    // Optionally, add a placeholder if OLLAMA_API_BASE_URL is not set
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
