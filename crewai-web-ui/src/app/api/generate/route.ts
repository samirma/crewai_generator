import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai'; // Added for DeepSeek

// Helper function to interact with LLMs
// No changes to interactWithLLM itself in this step, but it will receive fullPrompt directly.
async function interactWithLLM(
  fullPrompt: string, // This is now the directly passed, fully constructed prompt
  llmModel: string, // Original casing
  mode: string,
  runPhase: number | null
): Promise<{ llmResponseText: string; generatedScript?: string }> {
  const currentModelId = llmModel.toLowerCase(); // Keep for internal logic
  let llmResponseText = "";
  let generatedScript: string | undefined = undefined;

  // Note: Error handling within each block should ideally throw an error to be caught by the caller.
  // This keeps the function's primary return path clean.

  if (currentModelId.startsWith('gemini')) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set for model:", llmModel);
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: llmModel }); // Use original llmModel for API
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    console.log("Calling Gemini API...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      safetySettings,
      generationConfig: { temperature: 0 },
    });
    console.log("Gemini API call completed.");
    if (result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      llmResponseText = result.response.candidates[0].content.parts[0].text;
      console.log("Raw LLM response from Gemini:", llmResponseText);
    } else {
      let detailedError = "No content generated or unexpected response structure.";
      if (result.response && result.response.promptFeedback) {
        detailedError += ` Prompt feedback: ${JSON.stringify(result.response.promptFeedback)}`;
      }
      console.error("Gemini API call successful but response format is unexpected or content is missing.");
      throw new Error(`Gemini API Error: ${detailedError}`);
    }
  } else if (currentModelId.startsWith('deepseek/')) {
    const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepSeekApiKey) {
      console.error("DEEPSEEK_API_KEY is not set for model:", llmModel);
      throw new Error("DEEPSEEK_API_KEY is not configured for this model.");
    }
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: deepSeekApiKey,
    });
    console.log(`Using DeepSeek model ID: ${llmModel} for request via OpenAI SDK.`);
    console.log("Calling DeepSeek API via OpenAI SDK...");
    const completion = await openai.chat.completions.create({
      model: llmModel.substring('deepseek/'.length),
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0,
      stream: false,
    });
    console.log("DeepSeek API call completed via OpenAI SDK.");
    llmResponseText = completion.choices?.[0]?.message?.content;
    if (!llmResponseText) {
      console.error("DeepSeek API call via OpenAI SDK successful but response format is unexpected or content is missing.", completion);
      throw new Error("DeepSeek API Error (OpenAI SDK): No content generated or unexpected response structure.");
    }
    console.log("Raw LLM response from DeepSeek (OpenAI SDK):", llmResponseText);
  } else if (currentModelId.startsWith('ollama/')) {
    const ollamaApiBaseUrl = process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434';
    const ollamaModelName = llmModel.substring('ollama/'.length);
    console.log(`Calling Ollama API for model: ${ollamaModelName} at base URL: ${ollamaApiBaseUrl}`);
    const response = await fetch(`${ollamaApiBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModelName, prompt: fullPrompt, stream: false, temperature: 0.0 }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Ollama API request failed: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Ollama API request failed: ${response.statusText}. Details: ${errorBody}`);
    }
    const ollamaData = await response.json();
    llmResponseText = ollamaData.response;
    if (!llmResponseText) {
        console.error("Ollama API call successful but response content is missing.", ollamaData);
        throw new Error("Ollama API Error: No content in response.");
    }
    console.log("Raw LLM response from Ollama:", llmResponseText);
  } else {
    // Unhandled models
    console.warn(`Unhandled model: ${llmModel}. Request mode: ${mode}, phase: ${runPhase}.`);
    if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
      throw new Error(`Model ${llmModel} is not configured for advanced mode phases 1 or 2 direct output.`);
    }
    // Fallback to mock script generation for simple mode or advanced phase 3
    llmResponseText = `# Mock response for unhandled model ${llmModel}\n# Mode: ${mode}, Phase: ${runPhase}\nprint("Hello from mock Python script for unhandled model!")`;
    console.log(`Falling back to mock script generation for unhandled model ${llmModel}.`);
  }

  // Script extraction logic, applicable if not returning early for advanced phases 1 & 2
  if (mode === 'simple' || (mode === 'advanced' && runPhase === 3)) {
    let scriptToExtract = llmResponseText;

    const pythonCodeBlockRegex = /```python\n([\s\S]*?)\n```/g;
    const pythonMatches = Array.from(scriptToExtract.matchAll(pythonCodeBlockRegex));

    if (pythonMatches.length > 0) {
      generatedScript = pythonMatches[pythonMatches.length - 1][1];
      console.log(`Extracted last Python code block from markdown for ${llmModel}.`);
    } else {
      const genericCodeBlockRegex = /```\n?([\s\S]*?)\n?```/g;
      const genericMatches = Array.from(scriptToExtract.matchAll(genericCodeBlockRegex));

      if (genericMatches.length > 0) {
        generatedScript = genericMatches[genericMatches.length - 1][1].trim();
        console.log(`Extracted last generic code block from markdown for ${llmModel}.`);
      } else {
        // No markdown block detected, assume the whole response is the script
        generatedScript = scriptToExtract;
        console.log(`No markdown block detected for ${llmModel}. Using entire response as script.`);
      }
    }
    // If it was the mock response for unhandled model, generatedScript will be that mock script.
  }

  return { llmResponseText, generatedScript };
}

// Main API Handler
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      llmModel,
      mode = 'simple', // 'simple' or 'advanced'
      runPhase,        // 1, 2, or 3 for advanced mode. Can be null/undefined if mode is 'simple'.
      fullPrompt       // The pre-constructed prompt from the frontend
    } = body;

    // Validate essential parameters
    if (!llmModel || !fullPrompt) {
      return NextResponse.json({ error: "Missing required parameters: llmModel and fullPrompt." }, { status: 400 });
    }
    if (mode !== 'simple' && mode !== 'advanced') {
      return NextResponse.json({ error: "Invalid 'mode'. Must be 'simple' or 'advanced'." }, { status: 400 });
    }
    if (mode === 'advanced' && (runPhase !== 1 && runPhase !== 2 && runPhase !== 3)) {
      return NextResponse.json({ error: "Invalid 'runPhase' for advanced mode. Must be 1, 2, or 3." }, { status: 400 });
    }
     if (mode === 'simple' && runPhase !== undefined && runPhase !== null) {
      // runPhase is not expected for simple mode, but not treating as critical error, just log.
      console.warn(`Received runPhase='${runPhase}' for simple mode. This is not typically expected.`);
    }


    // Simplified logging
    console.log(`Received request: mode='${mode}', llmModel='${llmModel}', fullPrompt length: ${fullPrompt.length}`);
    if (mode === 'advanced') {
      console.log(`Advanced mode phase: ${runPhase}`);
    }

    // The fullPrompt is now received directly from the client.
    // No need to call readPromptFile or constructPrompt on the backend.

    try {
      // Call interactWithLLM with the fullPrompt received from the client
      const llmResult = await interactWithLLM(fullPrompt, llmModel, mode, runPhase);
      const llmResponseText = llmResult.llmResponseText; // Always present
      let generatedScript = llmResult.generatedScript; // Optional, changed to let

      // Return structure now includes the fullPrompt that was sent in the request
      if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
        return NextResponse.json({ phase: runPhase, output: llmResponseText, fullPrompt: fullPrompt });
      }

      // Ollama-specific LLM configuration injection
      if (generatedScript && typeof generatedScript === 'string' && llmModel.startsWith('ollama/')) {
        const resolvedOllamaUrl = process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434';
        const ollamaModelName = llmModel.substring('ollama/'.length);
        const chatOllamaImport = "from crewai.llms import ChatOllama";

        // Ensure the comment and the llm assignment are on separate lines in the script
        const ollamaLLMConfigLine = `# Ollama LLM configuration added by CrewAI Studio\nllm = ChatOllama(model='${ollamaModelName}', base_url='${resolvedOllamaUrl}', temperature=0.0)`;

        if (!generatedScript.includes(chatOllamaImport)) {
          // Prepend the import if it's not already there
          generatedScript = chatOllamaImport + "\n" + generatedScript;
        }

        let scriptLines = generatedScript.split('\n');
        let lastImportIndex = -1;
        // Find the index of the last import statement
        for (let i = 0; i < scriptLines.length; i++) {
          const line = scriptLines[i].trim();
          if (line.startsWith("import ") || line.startsWith("from ")) {
            lastImportIndex = i;
          } else if (line !== "" && !line.startsWith("#")) {
            // Stop searching after the first non-import, non-empty, non-comment line
            break;
          }
        }

        // Determine where to insert the Ollama LLM configuration
        const insertIndex = lastImportIndex + 1;
        const configLinesToInsert = ollamaLLMConfigLine.split('\n');

        // Check if there's already content at the insertIndex and if it's not just whitespace
        // Add a blank line before the config if inserting before existing code.
        if (scriptLines[insertIndex] && scriptLines[insertIndex].trim() !== "") {
          scriptLines.splice(insertIndex, 0, "", ...configLinesToInsert);
        } else {
          // If inserting at the end of imports or into an empty line, no need for an extra blank line before.
          scriptLines.splice(insertIndex, 0, ...configLinesToInsert);
        }

        generatedScript = scriptLines.join('\n');
      }

      if (generatedScript !== undefined) {
        if (mode === 'simple') {
          // For simple mode, phasedOutputs might be relevant if the script produces them
          // However, the current llmResult from interactWithLLM doesn't include phasedOutputs
          // This might need adjustment if simple mode is expected to also return structured task outputs
          // directly from the /api/generate call, or if they are only handled by /api/execute
          return NextResponse.json({ generatedScript, fullPrompt: fullPrompt /* phasedOutputs: [] an example if needed */ });
        } else { // Advanced mode, phase 3
          return NextResponse.json({ generatedScript, phase: 3, fullPrompt: fullPrompt /* phasedOutputs: [] an example if needed */ });
        }
      } else {
        // This case should ideally not be reached if llmModel.startsWith('ollama/') and generatedScript was initially undefined,
        // as the injection logic itself checks for generatedScript.
        // However, if generatedScript was undefined from llmResult and it's not an Ollama model, this path is valid.
        console.error(`Error: generatedScript is undefined for mode='${mode}' and runPhase='${runPhase}'. This should not happen if a script was expected.`);
        return NextResponse.json({ error: "Failed to process LLM output for script generation." }, { status: 500 });
      }

    } catch (apiError) {
      console.error(`Error interacting with LLM for model ${llmModel}:`, apiError);
      const message = apiError instanceof Error ? apiError.message : String(apiError);
      return NextResponse.json({ error: message, fullPrompt: fullPrompt }, { status: 500 }); // Include fullPrompt for client debugging
    }

  } catch (error) { // Catch-all for errors during request processing (e.g., JSON parsing)
    console.error("Error in API route processing:", error);
    let errorMessage = "An unknown error occurred in API route.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
