import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { interactWithLLM } from './llm.service';

const promptsDir = path.join(process.cwd(), 'public', 'prompts');

async function readPrompt(promptName: string): Promise<string> {
  const promptPath = path.join(promptsDir, promptName);
  return fs.readFile(promptPath, 'utf-8');
}

export async function POST(request: Request) {
  let llmInputPromptContent = "";
  let llmOutputPromptContent = "";
  try {
    const body = await request.json();
    const {
      llmModel,
      phase,
      blueprint,
      agents_yaml,
      tasks_yaml,
      crew_py,
      initialInput
    } = body;

    if (!llmModel || !phase) {
      return NextResponse.json({ error: "Missing required parameters: llmModel and phase." }, { status: 400 });
    }

    let fullPrompt: string;
    let runPhase: number;

    switch (phase) {
      case 'blueprint':
        fullPrompt = (await readPrompt('phase1_blueprint_prompt.md')).replace('{{initial_input}}', initialInput);
        runPhase = 1;
        break;
      case 'agents_yaml':
        fullPrompt = (await readPrompt('phase3_agents_prompt.md')).replace('{{blueprint}}', blueprint);
        runPhase = 2;
        break;
      case 'tasks_yaml':
        fullPrompt = (await readPrompt('phase4_tasks_prompt.md'))
          .replace('{{blueprint}}', blueprint)
          .replace('{{agents_yaml}}', agents_yaml);
        runPhase = 2;
        break;
      case 'crew_py':
        fullPrompt = (await readPrompt('phase5_crew_prompt.md'))
          .replace('{{blueprint}}', blueprint)
          .replace('{{agents_yaml}}', agents_yaml)
          .replace('{{tasks_yaml}}', tasks_yaml);
        runPhase = 3;
        break;
      case 'main_py':
        fullPrompt = (await readPrompt('phase6_main_prompt.md'))
          .replace('{{blueprint}}', blueprint)
          .replace('{{crew_py}}', crew_py);
        runPhase = 3;
        break;
      default:
        return NextResponse.json({ error: "Invalid phase." }, { status: 400 });
    }

    console.log(`Received request: llmModel='${llmModel}', phase: ${phase}`);

    try {
      const { llmResponseText, generatedScript, duration } = await interactWithLLM(fullPrompt, llmModel, runPhase);

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

      return NextResponse.json({
        phase,
        output: llmResponseText,
        generatedScript,
        fullPrompt,
        llmInputPromptContent,
        llmOutputPromptContent,
        duration
      });

    } catch (apiError) {
      console.error(`Error interacting with LLM for model ${llmModel}:`, apiError);
      const message = apiError instanceof Error ? apiError.message : String(apiError);
      return NextResponse.json({ error: message, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent }, { status: 500 });
    }

  } catch (error) {
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
