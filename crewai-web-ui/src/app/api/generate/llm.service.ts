import OpenAI from 'openai';
import fs from 'fs/promises';
import { getModelConfig } from '../../../config/models.config';
import path from 'path';

function stripThinkingTags(content: string): string {
  // Remove <thinking>...</thinking> tags and their content
  // Handles both <thinking> and <think> tags
  return content
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

export async function interactWithLLM(
  fullPrompt: string,
  llmModel: string,
  runPhase: number | null
): Promise<{ llmResponseText: string; generatedScript?: string; duration: number; tokensPerSecond: number }> {
  const startTime = Date.now();

  const modelConfig = await getModelConfig(llmModel);

  if (!modelConfig) {
    throw new Error(`Model ${llmModel} not found in configuration.`);
  }

  let llmResponseText = "";
  let rawResponse = "";
  let generatedScript: string | undefined = undefined;
  let completion: OpenAI.Chat.Completions.ChatCompletion | any;

  let apiKey = process.env[modelConfig.apiKey];
  if (!apiKey) {
    if (modelConfig.apiKey === 'OLLAMA_API_KEY' || modelConfig.apiKey === 'LOCAL_API_KEY') {
      apiKey = 'dummy-key'; // Dummy key for local Ollama or Local OpenAI-compatible server
    } else {
      throw new Error(`${modelConfig.apiKey} is not set for model: ${llmModel}`);
    }
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: modelConfig.baseURL,
  });

  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    model: modelConfig.model,
    messages: [{ role: "user", content: fullPrompt }],
    temperature: 0,
    stream: false,
  };

  if (!modelConfig.id.startsWith('gemini')) {
    params.frequency_penalty = 0.0;
    params.presence_penalty = 0.0;
  }

  if (modelConfig.maxOutputTokens) {
    params.max_tokens = modelConfig.maxOutputTokens;
  }

  console.log(`Using model: ${modelConfig.model} for request via OpenAI SDK.`);
  const { messages, ...restParams } = params;
  console.log("Calling API with params:", {
    url: modelConfig.baseURL,
    ...restParams,
    promptSummary: `${fullPrompt.substring(0, 100)}...`,
  });
  try {
    completion = await openai.chat.completions.create(params);
    console.log("API call completed.");
    rawResponse = completion.choices?.[0]?.message?.content ?? '';
    llmResponseText = stripThinkingTags(rawResponse);
  } catch (error) {
    console.error(`Error interacting with LLM for model ${llmModel}:`, error);
    if (error instanceof OpenAI.APIError) {
      // Handle 429, 400, and 500 status codes
      if (error.status === 429) {
        throw new Error(`Error 429: Too many requests. Please wait and try again. Details: ${error.message}`);
      } else if (error.status >= 400 && error.status < 500) {
        throw new Error(`Error ${error.status}: Client error. Details: ${error.message}`);
      } else if (error.status >= 500) {
        throw new Error(`Error ${error.status}: Server error. Please try again later. Details: ${error.message}`);
      }
    }
    // Re-throw other errors
    throw error;
  }

  if (!llmResponseText) {
    console.error("API call successful but response format is unexpected or content is missing.");
  }

  if (runPhase === 9) {
    generatedScript = llmResponseText;
  }

  const endTime = Date.now();
  const duration = parseFloat(((endTime - startTime) / 1000).toFixed(2));

  const completionTokens = completion?.usage?.completion_tokens || 0;
  const tokensPerSecond = duration > 0 ? parseFloat((completionTokens / duration).toFixed(2)) : 0;

  // Save both input and output files at the end
  // Output is saved before stripping thinking tags to preserve the raw response
  try {
    const inputPath = path.join(process.cwd(), 'llm_input_prompt.txt');
    const outputPath = path.join(process.cwd(), 'llm_output_prompt.txt');
    
    await fs.writeFile(inputPath, fullPrompt);
    await fs.writeFile(outputPath, rawResponse); // Save raw response with thinking tags
    
    console.log('Successfully wrote LLM input to llm_input_prompt.txt');
    console.log('Successfully wrote LLM output (with thinking tags) to llm_output_prompt.txt');
  } catch (error) {
    console.error('Failed to write LLM input/output to files:', error);
  }

  return { llmResponseText, generatedScript, duration, tokensPerSecond };
}
