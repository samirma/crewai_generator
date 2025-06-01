import { NextResponse } from 'next/server';

interface Model {
  id: string;
  name: string;
}

export async function GET() {
  let allModels: Model[] = [];

  // 1. Base Models (placeholders or non-discoverable)
  // These are models that we want to ensure are always in the list,
  // or for services where SDKs don't yet support listing models.
  const baseModels: Model[] = [
    // Example: If we knew specific OpenAI model IDs we want to support but can't list them via an SDK easily.
    // { id: "openai/gpt-4-turbo", name: "OpenAI GPT-4 Turbo (Placeholder)" },
    // For now, let's add the previously hardcoded non-Gemini/Ollama models here if they were meant to be placeholders
    // { id: "chatgpt", name: "ChatGPT (Placeholder)" }, // OpenAI/ChatGPT removed
    // { id: "deepseek", name: "DeepSeek (Placeholder)" } // Replaced with specific models below
    { id: "deepseek-chat", name: "DeepSeek (Chat)" },
    { id: "deepseek-coder", name: "DeepSeek (Coder)" }
  ];
  allModels = [...baseModels];

  // 2. Gemini Models (currently hardcoded, as no list API in Google AI SDK for Node.js)
  // Use the exact model names that the GoogleGenerativeAI SDK expects for the 'model' parameter.
  const geminiModelIds = [
    "gemini-pro",             // Standard Gemini Pro, still relevant
    "gemini-1.5-pro-latest",  // Latest Pro model
    "gemini-1.5-flash-latest" // Latest Flash model
  ];

  const geminiModels: Model[] = geminiModelIds.map(id => {
    // Create a more human-readable name from the ID
    let name = `Gemini ${id.replace(/-/g, ' ')}`;
    name = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    if (name.includes("Latest")) name = name.replace("Latest", "(Latest)");
    return {
      id: id, // The ID used by the API
      name: name
    };
  });
  allModels = [...allModels, ...geminiModels];

  // 3. Ollama Models (fetched via API)
  const ollamaApiBaseUrl = process.env.OLLAMA_API_BASE_URL;
  if (ollamaApiBaseUrl) {
    console.log(`Fetching Ollama models from ${ollamaApiBaseUrl}/api/tags`);
    try {
      const response = await fetch(`${ollamaApiBaseUrl}/api/tags`, { cache: 'no-store' }); // Disable cache for dynamic fetching
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          const ollamaFetchedModels: Model[] = data.models.map((model: any) => {
            const modelNameParts = model.name.split(':');
            const baseName = modelNameParts[0];
            const tag = modelNameParts[1] || 'latest';
            return {
              id: `ollama/${model.name}`, // Prefix with ollama/ to namespace
              name: `Ollama ${baseName.charAt(0).toUpperCase() + baseName.slice(1)} (${tag})`
            };
          });
          allModels = [...allModels, ...ollamaFetchedModels];
          console.log(`Successfully fetched ${ollamaFetchedModels.length} Ollama models.`);
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
    console.log("OLLAMA_API_BASE_URL not set. Skipping Ollama model fetching.");
    // Optionally, add a placeholder if OLLAMA_API_BASE_URL is not set but you still want an Ollama option
    allModels.push({ id: "ollama/not-configured", name: "Ollama (Not Configured)" });
  }

  // Remove duplicates by ID
  // This is important if baseModels or other sources might overlap with fetched models
  const uniqueModels = new Map<string, Model>();
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
