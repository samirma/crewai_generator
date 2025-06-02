import { NextResponse } from 'next/server';
import { ModelConfig, staticModels } from '../../../config/models.config';

export async function GET() {
  // Initialize with static models from the configuration file
  let allModels: ModelConfig[] = [...staticModels];

  // Ollama specific logic has been removed.

  // Remove duplicates by ID (though less likely to be necessary without dynamic models)
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
