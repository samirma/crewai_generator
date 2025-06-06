import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai'; // Added for DeepSeek
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import Docker from 'dockerode';
import { exec } from 'child_process'; // For docker build command

// Helper function to execute Python script in Docker
async function executePythonScript(scriptContent: string): Promise<{ stdout: string; stderr: string }> {
  const docker = new Docker(); // Assumes Docker is accessible (e.g., /var/run/docker.sock)
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crewai-script-'));
  const scriptPath = path.join(tempDir, 'script.py');
  await fs.writeFile(scriptPath, scriptContent);

  const imageName = 'python-runner';

  // Ensure python-runner image exists by attempting to build it.
  // cwd should be the project root where 'python-runner' directory exists.
  // If process.cwd() for the API route is /app/crewai-web-ui, then '..' is /app.
  const projectRoot = path.resolve(process.cwd(), '..');
  console.log(`Attempting to build Docker image '${imageName}' from ${projectRoot}/python-runner`);

  try {
    await new Promise<void>((resolve, reject) => {
      exec(`docker build -t ${imageName} ./python-runner`, { cwd: projectRoot }, (err, stdout, stderr) => {
        if (err) {
          console.error(`Error building ${imageName} image:`, stderr);
          // It might be okay if the image already exists, Docker build might still exit with error code 0 on cache hits.
          // However, a genuine build failure is a problem.
          // For now, let's log and try to proceed if error isn't fatal (e.g. image already exists)
          // A more robust check would inspect the error.
          if (stderr.includes("ERROR: failed to solve")) { // A more specific check for build failure
             return reject(new Error(`Failed to build ${imageName}: ${stderr}`));
          }
          console.warn(`Warning/Error during ${imageName} build (might be okay if image already exists or due to caching):`, stderr);
        }
        console.log(`${imageName} image build process output (or already exists):`, stdout);
        resolve();
      });
    });
  } catch (buildError) {
    console.error(`Critical failure to build ${imageName} image:`, buildError);
    await fs.rm(tempDir, { recursive: true, force: true });
    // If build fails critically, we cannot proceed.
    throw new Error(`Critical Docker image build failure for ${imageName}: ${buildError instanceof Error ? buildError.message : String(buildError)}`);
  }

  let stdout = '';
  let stderr = '';

  try {
    console.log(`Creating Docker container for image '${imageName}' with script from ${tempDir}`);
    const container = await docker.createContainer({
      Image: imageName,
      Cmd: ['python', 'script.py'],
      WorkingDir: '/usr/src/app',
      HostConfig: {
        Mounts: [
          {
            Type: 'bind',
            Source: tempDir,
            Target: '/usr/src/app'
          }
        ],
        AutoRemove: true,
      },
      Tty: false,
    });

    const stream = await container.attach({ stream: true, stdout: true, stderr: true });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => {
      // The first 8 bytes of the chunk are the header (type, size).
      // Type 1 is stdout, Type 2 is stderr.
      if (chunk.length > 8) {
        const type = chunk[0];
        const payload = chunk.slice(8);
        if (type === 1) {
          stdoutChunks.push(payload);
        } else if (type === 2) {
          stderrChunks.push(payload);
        }
      }
    });

    await container.start();
    console.log(`Container for ${imageName} started. Waiting for completion.`);
    await container.wait();
    console.log(`Container for ${imageName} finished.`);

    stdout = Buffer.concat(stdoutChunks).toString('utf-8');
    stderr = Buffer.concat(stderrChunks).toString('utf-8');

  } catch (err) {
    console.error("Error running Python script in Docker:", err);
    stderr += `\nError executing script in Docker: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    console.log(`Cleaning up temporary directory: ${tempDir}`);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
  console.log("Python script execution stdout:", stdout);
  console.log("Python script execution stderr:", stderr);
  return { stdout, stderr };
}

// Helper function to read prompt files from 'public/prompts/'
const readPromptFile = async (fileName: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(process.cwd(), 'public', 'prompts', fileName), 'utf-8');
  } catch (err) {
    console.error(`Error reading prompt file ${fileName}:`, err);
    throw new Error(`Could not load prompt file ${fileName}. Ensure it exists in 'crewai-web-ui/public/prompts/'.`);
  }
};

// Helper function to construct the full prompt
async function constructPrompt(
  mode: string,
  runPhase: number | null,
  initialInput: string, // User's primary input for the current step/mode
  phase1_prompt_text: string | null, // Custom text for phase 1 prompt
  phase2_prompt_text: string | null, // Custom text for phase 2 prompt
  phase3_prompt_text: string | null, // Custom text for phase 3 prompt
  originalInitialInput: string | null, // Original user input (for advanced phases 2 & 3)
  phase1PromptOutputText: string | null, // Output text from phase 1 (used as input for phase 2 prompt template)
  phase2PromptOutputText: string | null  // Output text from phase 2 (used as input for phase 3 prompt template)
): Promise<string> {
  let fullPrompt = "";

  if (mode === 'simple') {
    console.log("Constructing prompt for 'simple' mode.");
    const phase1Content = await readPromptFile('phase1_blueprint_prompt.md');
    const phase2Content = await readPromptFile('phase2_architecture_prompt.md');
    const phase3Content = await readPromptFile('phase3_script_prompt.md');
    const metaPrompt = `${phase1Content}\n\n${phase2Content}\n\n${phase3Content}`;
    const basePromptInstruction = `\n\nUser Instruction: @@@${initialInput}@@@\n\nGenerate the Python script for CrewAI based on this. Ensure each task's output is clearly marked with '### CREWAI_TASK_OUTPUT_MARKER: <task_name> ###' on a new line, followed by the task's output on subsequent lines.`;
    fullPrompt = `${metaPrompt}${basePromptInstruction}`;
  } else if (mode === 'advanced') {
    let currentPhasePromptTemplate = "";
    if (runPhase === 1) {
      currentPhasePromptTemplate = phase1_prompt_text && phase1_prompt_text.trim() !== '' ? phase1_prompt_text : await readPromptFile('phase1_blueprint_prompt.md');
      // For Phase 1, initialInput is the original user instruction.
      fullPrompt = `User Instruction: @@@${initialInput}@@@\n\n${currentPhasePromptTemplate}`;
    } else if (runPhase === 2) {
      currentPhasePromptTemplate = phase2_prompt_text && phase2_prompt_text.trim() !== '' ? phase2_prompt_text : await readPromptFile('phase2_architecture_prompt.md');
      if (!originalInitialInput || !phase1PromptOutputText) {
        console.error("Missing originalInitialInput or phase1PromptOutputText for phase 2 prompt construction in constructPrompt");
        throw new Error("Internal server error: Missing required inputs for phase 2 prompt construction.");
      }
      // initialInput for runPhase 2 (payload.initialInput) is the output of phase 1 (Blueprint).
      // The main prompt structure is original user input + phase 1 prompt text + phase 2 prompt template.
      // phase1PromptOutputText is the text of the prompt used in phase 1, not its output.
      // The actual output of Phase 1 is passed as `initialInput` to the POST request for Phase 2,
      // but for constructing the cumulative prompt, we need the *text of the Phase 1 prompt itself*.
      // Let's adjust the parameters for constructPrompt for clarity later if needed.
      // For now, assuming phase1PromptOutputText is the *text content of the phase 1 prompt*
      // and originalInitialInput is the *very first user input*.
      fullPrompt = `User Instruction: @@@${originalInitialInput}@@@\n\n${phase1PromptOutputText}\n\n${currentPhasePromptTemplate}`;
      // Optional: Append the blueprint (output of phase 1, which is 'initialInput' for this phase) if the LLM needs it explicitly.
      // fullPrompt += `\n\nBlueprint (Output of Phase 1):\n${initialInput}`;

    } else if (runPhase === 3) {
      currentPhasePromptTemplate = phase3_prompt_text && phase3_prompt_text.trim() !== '' ? phase3_prompt_text : await readPromptFile('phase3_script_prompt.md');
      if (!originalInitialInput || !phase1PromptOutputText || !phase2PromptOutputText) {
        console.error("Missing originalInitialInput, phase1PromptOutputText, or phase2PromptOutputText for phase 3 prompt construction in constructPrompt");
        throw new Error("Internal server error: Missing required inputs for phase 3 prompt construction.");
      }
      // initialInput for runPhase 3 (payload.initialInput) is the output of phase 2 (Architecture Plan).
      // The main prompt structure is original user input + phase 1 prompt text + phase 2 prompt text + phase 3 prompt template.
      fullPrompt = `User Instruction: @@@${originalInitialInput}@@@\n\n${phase1PromptOutputText}\n\n${phase2PromptOutputText}\n\n${currentPhasePromptTemplate}`;
      // Optional: Append the architecture plan (output of phase 2, which is 'initialInput' for this phase) if the LLM needs it explicitly.
      // fullPrompt += `\n\nArchitecture Plan (Output of Phase 2):\n${initialInput}`;
    } else {
      // This case should ideally be caught before calling constructPrompt
      console.error(`Invalid 'runPhase' (${runPhase}) for advanced mode in constructPrompt.`);
      throw new Error("Invalid 'runPhase' for advanced mode. Must be 1, 2, or 3.");
    }
  } else {
    // This case should ideally be caught before calling constructPrompt
    console.error(`Invalid 'mode' (${mode}) in constructPrompt.`);
    throw new Error("Invalid 'mode'. Must be 'simple' or 'advanced'.");
  }
  return fullPrompt;
}

// Helper function to interact with LLMs
async function interactWithLLM(
  fullPrompt: string,
  llmModel: string, // Original casing
  mode: string,
  runPhase: number | null
): Promise<{ llmResponseText: string; generatedScript?: string }> {
  const currentModelId = llmModel.toLowerCase();
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
    const ollamaApiBaseUrl = process.env.OLLAMA_API_BASE_URL;
    if (!ollamaApiBaseUrl) {
      console.error("OLLAMA_API_BASE_URL is not configured.");
      throw new Error("OLLAMA_API_BASE_URL is not configured.");
    }
    const ollamaModelName = llmModel.substring('ollama/'.length);
    console.log(`Calling Ollama API for model: ${ollamaModelName} at base URL: ${ollamaApiBaseUrl}`);
    const response = await fetch(`${ollamaApiBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModelName, prompt: fullPrompt, stream: false }),
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
    if (scriptToExtract.includes('```python')) {
      const pythonCodeBlockRegex = /```python\n([\s\S]*?)\n```/;
      const match = scriptToExtract.match(pythonCodeBlockRegex);
      if (match && match[1]) {
        console.log(`Extracted Python code from markdown block for ${llmModel}.`);
        generatedScript = match[1];
      } else {
        // If ```python is present but regex fails, keep original text as script (might be malformed)
        generatedScript = scriptToExtract;
      }
    } else if (scriptToExtract.startsWith('```') && scriptToExtract.endsWith('```')) {
      const pythonCodeBlockRegex = /```\n?([\s\S]*?)\n?```/;
      const match = scriptToExtract.match(pythonCodeBlockRegex);
      if (match && match[1]) {
        console.log(`Extracted Python code from simple \`\`\` block for ${llmModel}.`);
        generatedScript = match[1].trim();
      } else {
        generatedScript = scriptToExtract.substring(3, scriptToExtract.length - 3).trim();
      }
    } else {
      // No markdown block detected, assume the whole response is the script
      generatedScript = scriptToExtract;
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
      initialInput, // Original user input for simple mode, or phase-specific input for advanced
      llmModel,
      mode = 'simple', // 'simple' or 'advanced'
      runPhase,        // 1, 2, or 3 for advanced mode
      phase1_prompt,   // Optional custom prompt for phase 1
      phase2_prompt,   // Optional custom prompt for phase 2
      phase3_prompt,   // Optional custom prompt for phase 3
      // previous_full_prompt, // No longer used directly for construction, but available if needed for logging.
      phase1_source_indicator, // Optional: 'custom' or filename
      phase2_source_indicator, // Optional: 'custom' or filename
      phase3_source_indicator,  // Optional: 'custom' or filename
      originalInitialInput, // For advanced mode phases 2 & 3. This is the first input by the user in the sequence.
      phase1PromptText,     // For advanced mode phase 2 & 3. This is the *text of the prompt used in phase 1*.
      phase2PromptText      // For advanced mode phase 3. This is the *text of the prompt used in phase 2*.
    } = body;

    // General request logging (excluding potentially very long prompt texts)
    console.log(`Received request: mode='${mode}', runPhase='${runPhase}', llmModel='${llmModel}'`);
    if (initialInput) console.log(`Initial input received (length: ${initialInput.length})`);
    // Specific prompt source logging will be handled within simple/advanced blocks

    // Standardize llmModel to lower case for consistent checks (though interactWithLLM will do it again)
    // const currentModelId = llmModel.toLowerCase(); // No longer needed here for dispatch

    // Validate mode and runPhase before calling constructPrompt or interactWithLLM
    if (mode !== 'simple' && mode !== 'advanced') {
      return NextResponse.json({ error: "Invalid 'mode'. Must be 'simple' or 'advanced'." }, { status: 400 });
    }
    if (mode === 'advanced' && (runPhase !== 1 && runPhase !== 2 && runPhase !== 3)) {
      return NextResponse.json({ error: "Invalid 'runPhase' for advanced mode. Must be 1, 2, or 3." }, { status: 400 });
    }

    // Construct the full prompt using the helper function
    // Note: The parameters phase1PromptText and phase2PromptText passed to constructPrompt
    // are the *text of the prompts used in previous phases*, not the LLM output of those phases.
    // The `initialInput` to `constructPrompt` is the direct input for the current phase (e.g. user's text for Phase 1, or Phase 1's output for Phase 2's thinking process)
    const fullPrompt = await constructPrompt(
      mode,
      runPhase,
      initialInput,
      phase1_prompt, // Custom text for phase 1 prompt (if any)
      phase2_prompt, // Custom text for phase 2 prompt (if any)
      phase3_prompt, // Custom text for phase 3 prompt (if any)
      originalInitialInput, // The very first user input for multi-stage advanced prompts
      phase1PromptText,     // The actual prompt text used in phase 1 (for advanced phase 2 & 3)
      phase2PromptText      // The actual prompt text used in phase 2 (for advanced phase 3)
    );


    // Logging for advanced mode based on source indicators (can be refined or moved into constructPrompt if preferred)
    if (mode === 'advanced') {
        const defaultPhase1FileName = "phase1_blueprint_prompt.md";
        const defaultPhase2FileName = "phase2_architecture_prompt.md";
        const defaultPhase3FileName = "phase3_script_prompt.md";
        let logMessageForAdvanced = "";

        if (runPhase === 1) {
            const phase1IsCustomText = phase1_prompt && phase1_prompt.trim() !== '';
            const p1EffectiveSource = phase1_source_indicator || (phase1IsCustomText ? "custom" : defaultPhase1FileName);
            logMessageForAdvanced = `Processing in 'advanced' mode, phase: 1. Generating using Phase 1(${p1EffectiveSource})`;
        } else if (runPhase === 2) {
            // For phase 2, phase1_source_indicator refers to how the *text of the phase 1 prompt* was derived.
            // If phase1PromptText is provided, it implies "custom" or a previously resolved source.
            const p1EffectiveSource = phase1_source_indicator || (phase1PromptText ? "previous_phase_custom" : "unknown");
            const phase2IsCustomText = phase2_prompt && phase2_prompt.trim() !== '';
            const p2EffectiveSource = phase2_source_indicator || (phase2IsCustomText ? "custom" : defaultPhase2FileName);
            logMessageForAdvanced = `Processing in 'advanced' mode, phase: 2. Generating using Phase 1(${p1EffectiveSource}) + Phase 2(${p2EffectiveSource})`;
        } else if (runPhase === 3) {
            const p1EffectiveSource = phase1_source_indicator || (phase1PromptText ? "previous_phase_custom" : "unknown");
            const p2EffectiveSource = phase2_source_indicator || (phase2PromptText ? "previous_phase_custom" : "unknown");
            const phase3IsCustomText = phase3_prompt && phase3_prompt.trim() !== '';
            const p3EffectiveSource = phase3_source_indicator || (phase3IsCustomText ? "custom" : defaultPhase3FileName);
            logMessageForAdvanced = `Processing in 'advanced' mode, phase: 3. Generating using Phase 1(${p1EffectiveSource}) + Phase 2(${p2EffectiveSource}) + Phase 3(${p3EffectiveSource})`;
        }
         if (logMessageForAdvanced) {
            console.log(logMessageForAdvanced);
        } else {
            console.log(`Processing in 'advanced' mode, phase: ${runPhase} (Log message construction error or invalid phase)`);
        }
    } else if (mode === 'simple') {
        console.log("Processing in 'simple' mode. Generating using phase 1(phase1_blueprint_prompt.md) + phase 2(phase2_architecture_prompt.md) + phase 3(phase3_script_prompt.md)");
    }


    // Note: currentModelId is already lowercased.
    // The llmModel variable (original casing) is used for the actual API call.

    try {
      const llmResult = await interactWithLLM(fullPrompt, llmModel, mode, runPhase);
      const llmResponseText = llmResult.llmResponseText; // Always present
      const generatedScript = llmResult.generatedScript; // Optional

      if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
        // For advanced mode phase 1 or 2, return the raw LLM output.
        // fullPrompt is returned for debugging/logging on client-side.
        return NextResponse.json({ phase: runPhase, output: llmResponseText, fullPrompt: fullPrompt });
      }

      // For simple mode or advanced phase 3, a generatedScript is expected.
      if (generatedScript !== undefined) {
        if (mode === 'simple') {
          return NextResponse.json({ generatedScript, fullPrompt: fullPrompt });
        } else { // Advanced mode, phase 3
          return NextResponse.json({ generatedScript, phase: 3, fullPrompt: fullPrompt });
        }
      } else {
        // This case implies that for simple mode or advanced phase 3, script extraction failed
        // or was not applicable, which would be an issue if a script was expected.
        // The interactWithLLM function is designed to provide a mock script for unhandled models
        // in these scenarios, so this path should ideally not be hit unless there's a bug.
        console.error("Error: generatedScript is undefined for simple mode or advanced phase 3, and no mock was provided.");
        return NextResponse.json({ error: "Failed to process LLM output for script generation." }, { status: 500 });
      }

    } catch (apiError) {
      // This catches errors thrown from interactWithLLM (e.g., API key issues, network failures, LLM API errors)
      console.error(`Error interacting with LLM or processing its response for model ${llmModel}:`, apiError);
      return NextResponse.json({ error: apiError instanceof Error ? apiError.message : String(apiError) }, { status: 500 });
    }

  } catch (error) { // Catch-all for errors during request processing (e.g., from constructPrompt) or unknown issues
    console.error("Error in API route:", error);
    let errorMessage = "An unknown error occurred in API route.";
    if (error instanceof Error) {
        errorMessage = error.message; // More specific error if available
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    // Check if the error is due to file reading (e.g. prompt files not found)
    if (errorMessage.startsWith("Could not load prompt file")) {
        // The error from readPromptFile now includes the path, so the details message here can be simpler or removed.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
