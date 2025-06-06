import { NextResponse } from 'next/server';
import { ModelConfig, staticModels } from '../../../config/models.config';

export async function GET() {
  let allModels: ModelConfig[] = [...staticModels];

  // Remove duplicates by ID - important if staticModels somehow overlaps
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
