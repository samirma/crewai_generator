import { NextResponse } from 'next/server';
import { ModelConfig, staticModels } from '../../../config/models.config';
import { fetchOllamaModels } from '../../../lib/ollama'; // Adjusted path

export async function GET() {
  let allModels: ModelConfig[] = [...staticModels];
  let ollamaModels: ModelConfig[] = [];

  const ollamaApiBaseUrl = process.env.OLLAMA_API_BASE_URL;

  if (ollamaApiBaseUrl) {
    console.log('[models/route.ts] OLLAMA_API_BASE_URL is defined. Attempting to fetch Ollama models.');
    ollamaModels = await fetchOllamaModels(); // This function now handles its own detailed logging

    if (ollamaModels.length === 0) {
      // If fetchOllamaModels returns empty and URL was present, it indicates an error during fetch
      console.warn('[models/route.ts] fetchOllamaModels returned no models, though OLLAMA_API_BASE_URL was set. Indicating API error.');
      allModels.push({ id: "ollama/error", name: "Ollama (API Error - Check Connection/URL)" });
    } else {
      allModels = [...allModels, ...ollamaModels];
    }
  } else {
    console.warn('[models/route.ts] OLLAMA_API_BASE_URL environment variable is not defined. Ollama models will not be fetched.');
    allModels.push({ id: "ollama/not-configured", name: "Ollama (Not Configured)" });
  }

  // Remove duplicates by ID - important if staticModels somehow overlaps or if error models are added multiple times
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
