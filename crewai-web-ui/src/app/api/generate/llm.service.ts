import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai'; // Added for DeepSeek
import fs from 'fs/promises';
import { getAllModels } from '../../../config/models.config';
import path from 'path';

// Helper function to interact with LLMs
// No changes to interactWithLLM itself in this step, but it will receive fullPrompt directly.
export async function interactWithLLM(
  fullPrompt: string, // This is now the directly passed, fully constructed prompt
  llmModel: string, // Original casing
  runPhase: number | null
): Promise<{ llmResponseText: string; generatedScript?: string; duration: number }> {
  const startTime = Date.now();

  // Fetch all model configurations
  const allModels = await getAllModels();
  const currentModelIdForMatching = llmModel.toLowerCase();
  const modelConfig = allModels.find(m => m.id.toLowerCase() === currentModelIdForMatching);

  if (modelConfig) {
    console.log(`Found configuration for model ${llmModel}:`, modelConfig);
  } else {
    console.log(`No specific configuration found for model ${llmModel}. Using default behavior.`);
  }

  try {
    const inputPath = path.join(process.cwd(), 'llm_input_prompt.txt');
    await fs.writeFile(inputPath, fullPrompt);
    console.log('Successfully wrote LLM input to llm_input_prompt.txt');
  } catch (error) {
    console.error('Failed to write LLM input to llm_input_prompt.txt:', error);
  }

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

    const generationConfig: Record<string, unknown> = { temperature: 0, frequencyPenalty: 0.0, presencePenalty: 0.0 };
    if (modelConfig?.maxOutputTokens) {
      generationConfig.maxOutputTokens = modelConfig.maxOutputTokens;
    }

    console.log("Calling Gemini API...");
    console.log("Gemini API call parameters:", { contents: [{ role: "user", parts: [{ text: fullPrompt }] }], safetySettings, generationConfig });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      safetySettings,
      generationConfig,
    });
    console.log("Gemini API call completed.");
    if (result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      llmResponseText = result.response.candidates[0].content.parts[0].text;
    } else {
      let detailedError = "No content generated or unexpected response structure.";
      if (result.response && result.response.promptFeedback) {
        detailedError += ` Prompt feedback: ${JSON.stringify(result.response.promptFeedback)}`;
      }
      console.warn("Gemini API call successful but response format is unexpected or content is missing. Returning empty string.", detailedError);
      llmResponseText = "";
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

    const deepSeekParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model: llmModel.substring('deepseek/'.length),
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0,
      stream: false,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    };
    if (modelConfig?.maxOutputTokens) {
      deepSeekParams.max_tokens = modelConfig.maxOutputTokens;
    }

    console.log(`Using DeepSeek model ID: ${llmModel} for request via OpenAI SDK.`);
    console.log("Calling DeepSeek API via OpenAI SDK...");
    console.log("DeepSeek API call parameters:", deepSeekParams);
    const completion = await openai.chat.completions.create(deepSeekParams);
    console.log("DeepSeek API call completed via OpenAI SDK.");
    llmResponseText = completion.choices?.[0]?.message?.content ?? '';
    if (!llmResponseText) {
      console.error("DeepSeek API call via OpenAI SDK successful but response format is unexpected or content is missing.", completion);
      throw new Error("DeepSeek API Error (OpenAI SDK): No content generated or unexpected response structure.");
    }
  } else if (currentModelId.startsWith('ollama/')) {
    const ollamaApiBaseUrl = process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434';
    const ollamaModelName = llmModel.substring('ollama/'.length);
    const OLLAMA_TIMEOUT_DURATION = 300000; // 300 seconds

    console.log(`Calling Ollama API for model: ${ollamaModelName} at base URL: ${ollamaApiBaseUrl}`);

    const ollamaOptions: Record<string, unknown> = { frequency_penalty: 0.0, presence_penalty: 0.0 };
    if (modelConfig?.maxOutputTokens) {
      ollamaOptions.num_predict = modelConfig.maxOutputTokens;
    }

    const ollamaRequestBody = {
      model: ollamaModelName,
      prompt: fullPrompt,
      stream: false,
      temperature: 0.0,
      options: ollamaOptions,
    };

    console.log("Ollama API call body:", JSON.stringify(ollamaRequestBody));

    const controller = new AbortController();
    const signal = controller.signal;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, OLLAMA_TIMEOUT_DURATION);

      const response = await fetch(`${ollamaApiBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaRequestBody),
        signal,
      });

      clearTimeout(timeoutId);
      timeoutId = undefined;

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
    } catch (error) { // Changed 'any' to 'any' to avoid TS error if 'dom' lib is not included
      if (timeoutId) { // Ensure timeout is cleared if an error occurs before fetch completes
        clearTimeout(timeoutId);
      }
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`Ollama API request timed out after ${OLLAMA_TIMEOUT_DURATION / 1000} seconds`);
        throw new Error(`Ollama API request timed out after ${OLLAMA_TIMEOUT_DURATION / 1000} seconds`);
      }
      // Re-throw other errors
      throw error;
    }
  } else {
    // Unhandled models
    console.warn(`Unhandled model: ${llmModel}. phase: ${runPhase}.`);
    if (runPhase === 1 || runPhase === 2) {
      throw new Error(`Model ${llmModel} is not configured for advanced mode phases 1 or 2 direct output.`);
    }
    // Fallback to mock script generation for simple mode or advanced phase 3
    llmResponseText = `# Mock response for unhandled model ${llmModel}\n# Phase: ${runPhase}\nprint("Hello from mock Python script for unhandled model!")`;
    console.log(`Falling back to mock script generation for unhandled model ${llmModel}.`);
  }

  // Script extraction logic, applicable if not returning early for advanced phases 1 & 2
  if (runPhase === 9) {
    // Use the utility function to extract the script
    generatedScript = llmResponseText;
    // The console logs from extractScript will indicate how the script was extracted.
    // If it was the mock response for unhandled model, generatedScript will be that mock script via extractScript.
  }

  const endTime = Date.now();
  const duration = parseFloat(((endTime - startTime) / 1000).toFixed(2));

  try {
    const outputPath = path.join(process.cwd(), 'llm_output_prompt.txt');
    await fs.writeFile(outputPath, llmResponseText);
    console.log('Successfully wrote LLM output to llm_output_prompt.txt');
  } catch (error) {
    console.error('Failed to write LLM output to llm_output_prompt.txt:', error);
  }

  return { llmResponseText, generatedScript, duration };
}
