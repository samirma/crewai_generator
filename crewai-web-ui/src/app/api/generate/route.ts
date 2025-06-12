import { NextResponse } from 'next/server';
// Import GoogleGenerativeAI, OpenAI, fs, path are now in llm.service.ts
import fs from 'fs/promises'; // fs is still needed for reading files in POST
import path from 'path'; // path is still needed for joining paths in POST
import { interactWithLLM } from './llm.service'; // Import the refactored function
// injectOllamaConfig import removed as the function is no longer used

// Main API Handler
export async function POST(request: Request) {
  let llmInputPromptContent = "";
  let llmOutputPromptContent = "";
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
      // fs and path imports for GoogleGenerativeAI and OpenAI are handled within llm.service.ts
      const { llmResponseText, generatedScript: llmGeneratedScript, duration } = await interactWithLLM(fullPrompt, llmModel, mode, runPhase);
      let generatedScript = llmGeneratedScript; // Optional, changed to let

      const inputFilePath = path.join(process.cwd(), 'llm_input_prompt.txt');
      const outputFilePath = path.join(process.cwd(), 'llm_output_prompt.txt');

      try {
        llmInputPromptContent = await fs.readFile(inputFilePath, 'utf-8');
      } catch (error) {
        console.error('Failed to read llm_input_prompt.txt:', error);
        // Keep llmInputPromptContent as ""
      }

      try {
        llmOutputPromptContent = await fs.readFile(outputFilePath, 'utf-8');
      } catch (error) {
        console.error('Failed to read llm_output_prompt.txt:', error);
        // Keep llmOutputPromptContent as ""
      }

      // Return structure now includes the fullPrompt that was sent in the request
      if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
        return NextResponse.json({ phase: runPhase, output: llmResponseText, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration });
      }

      // Ollama-specific LLM configuration injection block removed
      // as injectOllamaConfig has been removed from script.utils.ts

      if (generatedScript !== undefined) {
        if (mode === 'simple') {
          // For simple mode, phasedOutputs might be relevant if the script produces them
          // However, the current llmResult from interactWithLLM doesn't include phasedOutputs
          // This might need adjustment if simple mode is expected to also return structured task outputs
          // directly from the /api/generate call, or if they are only handled by /api/execute
          return NextResponse.json({ generatedScript, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration /* phasedOutputs: [] an example if needed */ });
        } else { // Advanced mode, phase 3
          return NextResponse.json({ generatedScript, phase: 3, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration /* phasedOutputs: [] an example if needed */ });
        }
      } else {
        // This case should ideally not be reached if llmModel.startsWith('ollama/') and generatedScript was initially undefined,
        // as the injection logic itself checks for generatedScript.
        // However, if generatedScript was undefined from llmResult and it's not an Ollama model, this path is valid.
        console.error(`Error: generatedScript is undefined for mode='${mode}' and runPhase='${runPhase}'. This should not happen if a script was expected.`);
        return NextResponse.json({ error: "Failed to process LLM output for script generation.", llmInputPromptContent, llmOutputPromptContent }, { status: 500 });
      }

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
