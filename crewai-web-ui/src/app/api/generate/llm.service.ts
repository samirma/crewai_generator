import OpenAI from 'openai';
import fs from 'fs/promises';
import { getAllModels } from '../../../config/models.config';
import path from 'path';

export async function interactWithLLM(
  fullPrompt: string,
  llmModel: string,
  runPhase: number | null
): Promise<{ llmResponseText: string; generatedScript?: string; duration: number }> {
  const startTime = Date.now();

  const allModels = await getAllModels();
  const modelConfig = allModels.find(m => m.id.toLowerCase() === llmModel.toLowerCase());

  if (!modelConfig) {
    throw new Error(`Model ${llmModel} not found in configuration.`);
  }

  try {
    const inputPath = path.join(process.cwd(), 'llm_input_prompt.txt');
    await fs.writeFile(inputPath, fullPrompt);
    console.log('Successfully wrote LLM input to llm_input_prompt.txt');
  } catch (error) {
    console.error('Failed to write LLM input to llm_input_prompt.txt:', error);
  }

  let llmResponseText = "";
  let generatedScript: string | undefined = undefined;
  let completion: any;

  const apiKey = process.env[modelConfig.apiKey];
  if (!apiKey) {
    throw new Error(`${modelConfig.apiKey} is not set for model: ${llmModel}`);
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
    ...restParams,
    promptSummary: `${fullPrompt.substring(0, 100)}...`,
  });
  try {
    completion = await openai.chat.completions.create(params);
    console.log("API call completed.");
    llmResponseText = completion.choices?.[0]?.message?.content ?? '';
  } catch (error) {
    console.error(`Error interacting with LLM for model ${llmModel}:`, error);
  }

  if (!llmResponseText) {
    console.error("API call successful but response format is unexpected or content is missing.");
  }

  if (runPhase === 9) {
    generatedScript = llmResponseText;
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
