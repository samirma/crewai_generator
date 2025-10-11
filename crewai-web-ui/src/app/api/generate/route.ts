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
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function cleanDirectory(dir: string) {
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.lstat(filePath);
      if (stat.isDirectory()) {
        await cleanDirectory(filePath);
        await fs.rmdir(filePath);
      } else {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error cleaning directory ${dir}:`, error);
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
    if (runPhase < 1 || runPhase > 9) {
      return NextResponse.json({ error: "Invalid 'runPhase'. Must be between 1 and 9." }, { status: 400 });
    }

    console.log(`Received request: llmModel='${llmModel}', fullPrompt length: ${fullPrompt.length}`);
    console.log(`Advanced mode phase: ${runPhase}`);

    try {
      const { llmResponseText, generatedScript: llmGeneratedScript, duration } = await interactWithLLM(fullPrompt, llmModel, runPhase);
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

      if (runPhase === 1) {
        await cleanDirectory(GENERATED_DIR);
        await ensureDirectoryExists(GENERATED_DIR);
        const readmePath = path.join(GENERATED_DIR, 'README.md');
        await fs.writeFile(readmePath, `# CrewAI Project: ${fullPrompt}`);
      }

      if (filePath && outputType === 'file') {
        const absolutePath = path.join(GENERATED_DIR, filePath);
        await ensureDirectoryExists(path.dirname(absolutePath));
        await fs.writeFile(absolutePath, llmResponseText);
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

      return NextResponse.json({ phase: runPhase, output: llmResponseText, generatedScript, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration });

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
