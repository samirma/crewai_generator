import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { interactWithLLM } from './llm.service';
import { parseFileBlocks } from '../../../utils/fileParser';

const WORKSPACE_DIR = path.join(process.cwd(), '..', 'workspace');
const GENERATED_DIR = path.join(WORKSPACE_DIR, 'crewai_generated');

async function ensureDirectoryExists(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function POST(request: Request) {
  let llmInputPromptContent = "";
  let llmOutputPromptContent = "";
  try {
    const body = await request.json();
    const {
      llmModel,
      runPhase,
      fullPrompt,
      filePath,
      outputType,
    } = body;

    if (!llmModel || !fullPrompt) {
      return NextResponse.json({ error: "Missing required parameters: llmModel and fullPrompt." }, { status: 400 });
    }

    console.log(`Received request: llmModel='${llmModel}', fullPrompt length: ${fullPrompt.length}`);
    console.log(`Advanced mode phase: ${runPhase}`);

    try {
      const { llmResponseText, generatedScript: llmGeneratedScript, duration, tokensPerSecond } = await interactWithLLM(fullPrompt, llmModel, runPhase);
      const generatedScript = llmGeneratedScript;

      const inputFilePath = path.join(process.cwd(), 'llm_input_prompt.txt');
      const outputFilePath = path.join(process.cwd(), 'llm_output_prompt.txt');

      try {
        llmInputPromptContent = await fs.readFile(inputFilePath, 'utf-8');
      } catch (error) {
        console.error('Failed to read llm_input_prompt.txt:', error);
      }

      try {
        llmOutputPromptContent = await fs.readFile(outputFilePath, 'utf-8');
      } catch (error) {
        console.error('Failed to read llm_output_prompt.txt:', error);
      }

      if (filePath && outputType === 'file') {
        const absolutePath = path.join(GENERATED_DIR, filePath);
        await ensureDirectoryExists(path.dirname(absolutePath));
        const fileBlocks = parseFileBlocks(llmResponseText);
        const contentToWrite = fileBlocks.length > 0 ? fileBlocks[0].content : llmResponseText;
        await fs.writeFile(absolutePath, contentToWrite);
        console.log(`Successfully wrote file: ${absolutePath}`);
      } else if (outputType === 'directory') {
        const fileBlocks = parseFileBlocks(llmResponseText);
        for (const file of fileBlocks) {
          const absolutePath = path.join(GENERATED_DIR, file.name);
          await ensureDirectoryExists(path.dirname(absolutePath));
          await fs.writeFile(absolutePath, file.content);
          console.log(`Successfully wrote file: ${absolutePath}`);
        }
      }

      return NextResponse.json({ phase: runPhase, output: llmResponseText, generatedScript, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration, tokensPerSecond });

    } catch (apiError) {
      console.error(`Error interacting with LLM for model ${llmModel}:`, apiError);
      const message = apiError instanceof Error ? apiError.message : String(apiError);
      return NextResponse.json({ error: message, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent }, { status: 500 }); // Include fullPrompt for client debugging
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
