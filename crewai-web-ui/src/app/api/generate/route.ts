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
    if (mode !== 'simple' && mode !== 'advanced') { // Frontend sends 'advanced' for multi-step phases
      return NextResponse.json({ error: "Invalid 'mode'. Must be 'simple' or 'advanced'." }, { status: 400 });
    }
    // For traditional advanced mode, runPhase must be 1, 2, or 3.
    // For multi-step (which arrives as mode: 'advanced'), runPhase might be undefined or could be the actual phase index.
    // We'll handle the undefined case specifically for multi-step.
    if (mode === 'advanced' && runPhase !== undefined && (runPhase < 1 || runPhase > 3) && typeof runPhase === 'number') {
       // This condition is for the original 3-phase advanced mode.
       // If runPhase is undefined, it could be a multi-step phase.
      console.warn(`Received runPhase='${runPhase}' for 'advanced' mode. This is only strictly validated for the original 3-phase flow.`);
      // No strict error return here to allow flexibility for multi-step phases if frontend sends actual phase index.
    }
     if (mode === 'simple' && runPhase !== undefined && runPhase !== null) {
      console.warn(`Received runPhase='${runPhase}' for simple mode. This is not typically expected.`);
    }

    // Logging
    console.log(`Received request: mode='${mode}', llmModel='${llmModel}', fullPrompt length: ${fullPrompt.length}`);
    if (mode === 'advanced') {
      if (runPhase === undefined) {
        console.log("Processing a phase for Multi-Step execution (mode='advanced', runPhase=undefined).");
      } else {
        console.log(`Advanced mode (single-step or multi-step with phase index) phase: ${runPhase}`);
      }
    }

    // The fullPrompt is now received directly from the client.
    try {
      // Determine the effective runPhase for interactWithLLM
      // For multi-step phases (arriving as mode: 'advanced', runPhase: undefined from current frontend logic),
      // we want raw output, similar to phase 1 or 2 of the original advanced mode.
      // So, we map `runPhase: undefined` to `1` for `interactWithLLM`.
      // If frontend sends an actual phase index (e.g. 1, 2, 3, 4...) for multi-step,
      // and if `interactWithLLM` needs a specific value for raw output, this logic might need adjustment.
      // For now, if runPhase is undefined, it's a multi-step phase call needing raw output.
      const effectiveRunPhaseForLLM = (mode === 'advanced' && runPhase === undefined) ? 1 : runPhase;

      const { llmResponseText, generatedScript: llmGeneratedScript, duration } = await interactWithLLM(fullPrompt, llmModel, mode, effectiveRunPhaseForLLM);
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
      // For multi-step (mode='advanced', runPhase=undefined from frontend), this block will be used.
      // It returns the raw 'output', which is what a multi-step phase needs.
      // The `phase` property in response might be `undefined` if `runPhase` was undefined.
      // Or, we can set it to a generic value or the received runPhase if frontend starts sending it for multi-step.
      if (mode === 'advanced' && (runPhase === undefined || runPhase === 1 || runPhase === 2)) {
        // If runPhase was undefined (multi-step), we used effectiveRunPhaseForLLM=1.
        // The response `phase` field can reflect the original runPhase if needed, or be generic.
        // For now, let's return the original runPhase (which could be undefined).
        return NextResponse.json({ phase: runPhase, output: llmResponseText, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration });
      }

      // This handles advanced mode, phase 3 (script generation)
      if (mode === 'advanced' && runPhase === 3) {
         return NextResponse.json({ generatedScript, phase: 3, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration });
      }


      // Ollama-specific LLM configuration injection block removed
      // as injectOllamaConfig has been removed from script.utils.ts

      if (generatedScript !== undefined) {
        // This is for 'simple' mode script generation.
        if (mode === 'simple') {
          return NextResponse.json({ generatedScript, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration });
        }
        // Note: mode 'advanced' runPhase 3 is handled above.
        // Other cases for generatedScript (if any) would need specific handling.
      } else if (mode === 'advanced' && runPhase !== 3) {
        // This case implies mode is 'advanced' but it's not phase 1, 2 (raw output) or 3 (script).
        // This shouldn't happen with current frontend logic if runPhase is undefined, 1 or 2 for raw output.
        // If runPhase is a multi-step index > 3 and NOT meant to be a script, it should have been handled by the raw output block.
        // This path indicates an unexpected state for 'advanced' mode if a script wasn't generated.
        console.warn(`Warning: generatedScript is undefined for advanced mode phase ${runPhase}, but not phase 1 or 2. LLM output was: ${llmResponseText}`);
        // Fallback to returning the raw text as output if no script was generated, and it wasn't phase 1 or 2.
        return NextResponse.json({ phase: runPhase, output: llmResponseText, fullPrompt: fullPrompt, llmInputPromptContent, llmOutputPromptContent, duration });

      } else if (mode === 'simple' && !generatedScript) {
         console.error(`Error: generatedScript is undefined for mode='simple'. LLM output was: ${llmResponseText}`);
         return NextResponse.json({ error: "Failed to process LLM output for script generation in simple mode.", llmInputPromptContent, llmOutputPromptContent, output: llmResponseText }, { status: 500 });
      }


    } catch (apiError) {
      console.error(`Error interacting with LLM for model ${llmModel} (mode: ${mode}, runPhase: ${runPhase}):`, apiError);
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
