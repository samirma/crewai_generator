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
      phase3_prompt    // Optional custom prompt for phase 3
    } = body;

    console.log(`Received request: mode='${mode}', runPhase='${runPhase}', llmModel='${llmModel}'`);
    if (initialInput) console.log(`Initial input received (length: ${initialInput.length})`);


    // Standardize llmModel to lower case for consistent checks
    const currentModelId = llmModel.toLowerCase();
    let fullPrompt = "";   // To store the combined prompt for the LLM
    let llmResponseText = ""; // To store raw text output from LLM

    // Helper function to read prompt files
    const readPromptFile = async (fileName: string): Promise<string> => {
      try {
        // Corrected path to read from 'public/prompts/'
        return await fs.readFile(path.join(process.cwd(), 'public', 'prompts', fileName), 'utf-8');
      } catch (err) {
        console.error(`Error reading prompt file ${fileName}:`, err);
        throw new Error(`Could not load prompt file ${fileName}.`);
      }
    };

    if (mode === 'simple') {
      console.log("Processing in 'simple' mode.");
      const phase1Content = await readPromptFile('phase1_blueprint_prompt.md');
      const phase2Content = await readPromptFile('phase2_architecture_prompt.md');
      const phase3Content = await readPromptFile('phase3_script_prompt.md');
      const metaPrompt = `${phase1Content}\n\n${phase2Content}\n\n${phase3Content}`;

      // In simple mode, initialInput is the user's overall instruction.
      const basePromptInstruction = `\n\nUser Instruction: ${initialInput}\n\nGenerate the Python script for CrewAI based on this. Ensure each task's output is clearly marked with '### CREWAI_TASK_OUTPUT_MARKER: <task_name> ###' on a new line, followed by the task's output on subsequent lines.`;
      fullPrompt = `${metaPrompt}${basePromptInstruction}`;

    } else if (mode === 'advanced') {
      console.log(`Processing in 'advanced' mode, phase: ${runPhase}.`);
      let promptContent = "";
      let phaseSpecificInput = initialInput; // In advanced mode, initialInput carries the output of the PREVIOUS phase.

      if (runPhase === 1) {
        promptContent = phase1_prompt && phase1_prompt.trim() !== '' ? phase1_prompt : await readPromptFile('phase1_blueprint_prompt.md');
        // For Phase 1, initialInput is the original user instruction.
        // The phase1_blueprint_prompt.md expects "User-provided 'Initial Instruction Input'"
        fullPrompt = `${promptContent}\n\nUser Instruction: ${initialInput}\n\n`;
      } else if (runPhase === 2) {
        promptContent = phase2_prompt && phase2_prompt.trim() !== '' ? phase2_prompt : await readPromptFile('phase2_architecture_prompt.md');
        // For Phase 2, initialInput is the Blueprint from Phase 1.
        // The phase2_architecture_prompt.md expects the "complete 'Blueprint' document" as its input.
        // We provide the blueprint (initialInput for this phase) directly. The prompt should instruct the LLM how to use it.
        fullPrompt = `${promptContent}\n\nBlueprint:\n${phaseSpecificInput}\n\n`;
      } else if (runPhase === 3) {
        promptContent = phase3_prompt && phase3_prompt.trim() !== '' ? phase3_prompt : await readPromptFile('phase3_script_prompt.md');
        // For Phase 3, initialInput is the Architecture Plan from Phase 2.
        // The phase3_script_prompt.md expects the "complete 'Design-Crew-Architecture-Plan' document" as its input.
        fullPrompt = `${promptContent}\n\nDesign-Crew-Architecture-Plan:\n${phaseSpecificInput}\n\n`;
      } else {
        return NextResponse.json({ error: "Invalid 'runPhase' for advanced mode. Must be 1, 2, or 3." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid 'mode'. Must be 'simple' or 'advanced'." }, { status: 400 });
    }

    // Note: currentModelId is already lowercased.
    // The llmModel variable (original casing) is used for the actual API call.
    if (currentModelId.startsWith('gemini')) {
      // GEMINI Handling
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not set for model:", llmModel);
        return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      // Use the original llmModel string which has the correct casing for the API
      const model = genAI.getGenerativeModel({ model: llmModel });
      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];

      try {
        console.log("Calling Gemini API...");
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          safetySettings,
          generationConfig: {
            temperature: 0,
          },
        });
        console.log("Gemini API call completed.");

        if (result.response && result.response.candidates && result.response.candidates.length > 0 &&
            result.response.candidates[0].content && result.response.candidates[0].content.parts &&
            result.response.candidates[0].content.parts.length > 0 &&
            result.response.candidates[0].content.parts[0].text) {

            llmResponseText = result.response.candidates[0].content.parts[0].text;
            console.log("Raw LLM response from Gemini:", llmResponseText);

            if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
              return NextResponse.json({ phase: runPhase, output: llmResponseText });
            }

            // Proceed to script extraction and execution for simple mode or phase 3 of advanced mode
            let generatedScript = llmResponseText;
            if (generatedScript.includes('```python')) {
              const pythonCodeBlockRegex = /```python\n([\s\S]*?)\n```/;
              const match = generatedScript.match(pythonCodeBlockRegex);
              if (match && match[1]) {
                console.log("Extracted Python code from markdown block for Gemini.");
                generatedScript = match[1];
              }
            }

            // Script execution removed from here
            if (mode === 'simple') {
              return NextResponse.json({ generatedScript });
            } else { // Advanced mode, phase 3
              return NextResponse.json({ generatedScript, phase: 3 });
            }

        } else {
          // Handle cases where Gemini response structure is not as expected
          console.error("Gemini API call successful but response format is unexpected or content is missing.");
          let detailedError = "No content generated or unexpected response structure.";
          if (result.response && result.response.promptFeedback) {
            detailedError += ` Prompt feedback: ${JSON.stringify(result.response.promptFeedback)}`;
          }
          return NextResponse.json({ error: `Gemini API Error: ${detailedError}` }, { status: 500 });
        }
      } catch (apiError) {
        console.error(`Error calling Gemini API or executing script for model ${llmModel}:`, apiError);
        return NextResponse.json({ error: apiError instanceof Error ? apiError.message : String(apiError) }, { status: 500 });
      }
    } else if (currentModelId.startsWith('deepseek/')) {
      // DEEPSEEK Handling - Now using OpenAI SDK
      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        console.error("DEEPSEEK_API_KEY is not set for model:", llmModel);
        return NextResponse.json({ error: "DEEPSEEK_API_KEY is not configured for this model." }, { status: 500 });
      }

      const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: deepSeekApiKey,
      });

      console.log(`Using DeepSeek model ID: ${llmModel} for request via OpenAI SDK.`);

      try {
        console.log("Calling DeepSeek API via OpenAI SDK...");
        const completion = await openai.chat.completions.create({
          model: llmModel.substring('deepseek/'.length), // Extract model name, e.g., "deepseek-chat"
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

        if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
          return NextResponse.json({ phase: runPhase, output: llmResponseText });
        }

        let generatedScript = llmResponseText;
        // Common script post-processing (e.g., extracting from markdown)
        if (generatedScript.includes('```python')) {
          const pythonCodeBlockRegex = /```python\n([\s\S]*?)\n```/;
          const match = generatedScript.match(pythonCodeBlockRegex);
          if (match && match[1]) {
            console.log("Extracted Python code from markdown block for DeepSeek.");
            generatedScript = match[1];
          }
        } else if (generatedScript.startsWith('```') && generatedScript.endsWith('```')) {
            const pythonCodeBlockRegex = /```\n?([\s\S]*?)\n?```/;
            const match = generatedScript.match(pythonCodeBlockRegex);
            if (match && match[1]) {
                console.log("Extracted Python code from simple ``` block for DeepSeek.");
                generatedScript = match[1].trim();
            }
        }

        // Script execution removed from here
        if (mode === 'simple') {
          return NextResponse.json({ generatedScript });
        } else { // Advanced mode, phase 3
          return NextResponse.json({ generatedScript, phase: 3 });
        }

      } catch (apiError) {
        console.error(`Error calling DeepSeek API via OpenAI SDK for model ${llmModel}:`, apiError);
        return NextResponse.json({ error: apiError instanceof Error ? apiError.message : String(apiError) }, { status: 500 });
      }
    } else if (currentModelId.startsWith('ollama/')) {
      // OLLAMA Handling
      const ollamaApiBaseUrl = process.env.OLLAMA_API_BASE_URL;
      if (!ollamaApiBaseUrl) {
        console.error("OLLAMA_API_BASE_URL is not configured.");
        return NextResponse.json({ error: "OLLAMA_API_BASE_URL is not configured." }, { status: 500 });
      }

      const ollamaModelName = llmModel.substring('ollama/'.length);
      console.log(`Calling Ollama API for model: ${ollamaModelName} at base URL: ${ollamaApiBaseUrl}`);

      try {
        const response = await fetch(`${ollamaApiBaseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: ollamaModelName,
            prompt: fullPrompt,
            stream: false, // Explicitly set stream to false as per common Ollama usage for single responses
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Ollama API request failed: ${response.status} ${response.statusText}`, errorBody);
          return NextResponse.json({ error: `Ollama API request failed: ${response.statusText}` }, { status: response.status });
        }

        const ollamaData = await response.json();
        llmResponseText = ollamaData.response; // Ollama typically returns the full response in 'response'
        console.log("Raw LLM response from Ollama:", llmResponseText);

        if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
          return NextResponse.json({ phase: runPhase, output: llmResponseText });
        }

        let generatedScript = llmResponseText;
        // Common script post-processing (e.g., extracting from markdown)
        if (generatedScript.includes('```python')) {
          const pythonCodeBlockRegex = /```python\n([\s\S]*?)\n```/;
          const match = generatedScript.match(pythonCodeBlockRegex);
          if (match && match[1]) {
            console.log("Extracted Python code from ```python block for Ollama.");
            generatedScript = match[1];
          }
        } else if (generatedScript.startsWith('```') && generatedScript.endsWith('```')) {
          const pythonCodeBlockRegex = /```\n?([\s\S]*?)\n?```/;
          const match = generatedScript.match(pythonCodeBlockRegex);
          if (match && match[1]) {
            console.log("Extracted Python code from simple ``` block for Ollama.");
            generatedScript = match[1].trim();
          }
        }

        // Script execution removed from here
        if (mode === 'simple') {
          return NextResponse.json({ generatedScript });
        } else { // Advanced mode, phase 3
          return NextResponse.json({ generatedScript, phase: 3 });
        }

      } catch (apiError) {
        console.error(`Error calling Ollama API for model ${llmModel}:`, apiError);
        return NextResponse.json({ error: apiError instanceof Error ? apiError.message : String(apiError) }, { status: 500 });
      }
    } else {
      // Fallback for other/unhandled models - This part should ideally not be reached if UI restricts model choices.
      // If reached, it implies a model was selected that doesn't have specific handling.
      // For advanced mode phase 1 & 2, we can't just return a mock script.
      // For simple mode or advanced phase 3, we could return a mock script.
      console.warn(`Unhandled model: ${llmModel}. Request mode: ${mode}, phase: ${runPhase}.`);
      if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
        return NextResponse.json({ error: `Model ${llmModel} is not configured for advanced mode phases 1 or 2 direct output.` }, { status: 501 });
      }

      // Fallback to mock script generation for simple mode or advanced phase 3 with unhandled model
      console.log(`Falling back to mock script generation for unhandled model ${llmModel} in ${mode} mode (phase ${runPhase}).`);
      const mockPythonScript = `# Mock Python script for ${llmModel}\n# Mode: ${mode}, Phase: ${runPhase}\n# Input: ${initialInput}\nprint("Hello from mock Python script for unhandled model!")`;
      // Script execution removed from here
      if (mode === 'simple') {
        return NextResponse.json({ generatedScript: mockPythonScript });
      } else { // Advanced mode, phase 3
        return NextResponse.json({ generatedScript: mockPythonScript, phase: 3 });
      }
    }

  } catch (error) { // Catch-all for errors during request processing or unknown issues
    console.error("Error in API route:", error);
    let errorMessage = "An unknown error occurred in API route.";
    if (error instanceof Error) {
        errorMessage = error.message; // More specific error if available
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    // Check if the error is due to file reading (e.g. prompt files not found)
    if (errorMessage.startsWith("Could not load prompt file")) {
        return NextResponse.json({ error: errorMessage, details: "Ensure prompt files (phase1_blueprint_prompt.md, etc.) exist in 'crewai-web-ui/' directory." }, { status: 500 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
