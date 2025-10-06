import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai'; // Added for DeepSeek
import fs from 'fs/promises';
import { getAllModels, ModelConfig } from '../../../config/models.config';
import path from 'path';

// Helper function to interact with LLMs
// No changes to interactWithLLM itself in this step, but it will receive fullPrompt directly.
export async function interactWithLLM(
  fullPrompt: string, // This is now the directly passed, fully constructed prompt
  llmModel: string, // Original casing
  runPhase: number | null // Kept for logging, but doesn't drive logic
): Promise<{ llmResponseText: string; duration: number }> {
  const startTime = Date.now();

  const allModels = await getAllModels();
  const modelConfig = allModels.find(m => m.id.toLowerCase() === llmModel.toLowerCase());

  if (modelConfig) {
    console.log(`Found configuration for model ${llmModel}:`, modelConfig);
  } else {
    console.log(`No specific configuration found for model ${llmModel}. Using default behavior.`);
  }

  try {
    const inputPath = path.join(process.cwd(), 'llm_input_prompt.txt');
    await fs.writeFile(inputPath, fullPrompt);
    console.log(`Successfully wrote LLM input for phase ${runPhase} to llm_input_prompt.txt`);
  } catch (error) {
    console.error('Failed to write LLM input to llm_input_prompt.txt:', error);
  }

  const currentModelId = llmModel.toLowerCase();
  let llmResponseText = "";

  if (currentModelId.startsWith('gemini')) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: llmModel });
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    const generationConfig: any = { temperature: 0, frequencyPenalty: 0.0, presencePenalty: 0.0 };
    if (modelConfig?.maxOutputTokens) {
      generationConfig.maxOutputTokens = modelConfig.maxOutputTokens;
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      safetySettings,
      generationConfig,
    });

    if (result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      llmResponseText = result.response.candidates[0].content.parts[0].text;
    } else {
      let detailedError = "No content generated or unexpected response structure.";
      if (result.response && result.response.promptFeedback) {
        detailedError += ` Prompt feedback: ${JSON.stringify(result.response.promptFeedback)}`;
      }
      throw new Error(`Gemini API Error: ${detailedError}`);
    }
  } else if (currentModelId.startsWith('deepseek/')) {
    const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepSeekApiKey) throw new Error("DEEPSEEK_API_KEY is not configured for this model.");

    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: deepSeekApiKey,
    });

    const deepSeekParams: any = {
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

    const completion = await openai.chat.completions.create(deepSeekParams);
    llmResponseText = completion.choices?.[0]?.message?.content ?? '';
    if (!llmResponseText) {
      throw new Error("DeepSeek API Error: No content generated or unexpected response structure.");
    }
  } else if (currentModelId.startsWith('ollama/')) {
    const ollamaApiBaseUrl = process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434';
    const ollamaModelName = llmModel.substring('ollama/'.length);
    const OLLAMA_TIMEOUT_DURATION = 300000; // 300 seconds

    const ollamaOptions: any = { frequency_penalty: 0.0, presence_penalty: 0.0 };
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_DURATION);

    try {
      const response = await fetch(`${ollamaApiBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaRequestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ollama API request failed: ${response.statusText}. Details: ${errorBody}`);
      }

      const ollamaData = await response.json();
      llmResponseText = ollamaData.response;
      if (!llmResponseText) {
        throw new Error("Ollama API Error: No content in response.");
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Ollama API request timed out after ${OLLAMA_TIMEOUT_DURATION / 1000} seconds`);
      }
      throw error;
    }
  } else {
    throw new Error(`Model ${llmModel} is not handled.`);
  }

  const endTime = Date.now();
  const duration = parseFloat(((endTime - startTime) / 1000).toFixed(2));

  try {
    const outputPath = path.join(process.cwd(), 'llm_output_prompt.txt');
    await fs.writeFile(outputPath, llmResponseText);
    console.log(`Successfully wrote LLM output for phase ${runPhase} to llm_output_prompt.txt`);
  } catch (error) {
    console.error('Failed to write LLM output to llm_output_prompt.txt:', error);
  }

  return { llmResponseText, duration };
}
