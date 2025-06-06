import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai'; // Added for DeepSeek
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import Docker from 'dockerode';
import { exec } from 'child_process'; // For docker build command

// Helper function to execute Python script in Docker
// No changes to executePythonScript itself in this step
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

// Helper function to interact with LLMs
// No changes to interactWithLLM itself in this step, but it will receive fullPrompt directly.
async function interactWithLLM(
  fullPrompt: string, // This is now the directly passed, fully constructed prompt
  llmModel: string, // Original casing
  mode: string,
  runPhase: number | null
): Promise<{ llmResponseText: string; generatedScript?: string }> {
  const currentModelId = llmModel.toLowerCase(); // Keep for internal logic
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
      const llmResult = await interactWithLLM(fullPrompt, llmModel, mode, runPhase);
      const llmResponseText = llmResult.llmResponseText; // Always present
      let generatedScript = llmResult.generatedScript; // Optional, changed to let

      // Return structure now includes the fullPrompt that was sent in the request
      if (mode === 'advanced' && (runPhase === 1 || runPhase === 2)) {
        return NextResponse.json({ phase: runPhase, output: llmResponseText, fullPrompt: fullPrompt });
      }

      // Ollama-specific LLM configuration injection
      if (generatedScript && typeof generatedScript === 'string' && llmModel.startsWith('ollama/')) {
        const resolvedOllamaUrl = process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434';
        const ollamaModelName = llmModel.substring('ollama/'.length);
        const chatOllamaImport = "from crewai.llms import ChatOllama";

        // Ensure the comment and the llm assignment are on separate lines in the script
        const ollamaLLMConfigLine = `# Ollama LLM configuration added by CrewAI Studio\nllm = ChatOllama(model='${ollamaModelName}', base_url='${resolvedOllamaUrl}', temperature=0.0)`;

        if (!generatedScript.includes(chatOllamaImport)) {
          // Prepend the import if it's not already there
          generatedScript = chatOllamaImport + "\n" + generatedScript;
        }

        let scriptLines = generatedScript.split('\n');
        let lastImportIndex = -1;
        // Find the index of the last import statement
        for (let i = 0; i < scriptLines.length; i++) {
          const line = scriptLines[i].trim();
          if (line.startsWith("import ") || line.startsWith("from ")) {
            lastImportIndex = i;
          } else if (line !== "" && !line.startsWith("#")) {
            // Stop searching after the first non-import, non-empty, non-comment line
            break;
          }
        }

        // Determine where to insert the Ollama LLM configuration
        const insertIndex = lastImportIndex + 1;
        const configLinesToInsert = ollamaLLMConfigLine.split('\n');

        // Check if there's already content at the insertIndex and if it's not just whitespace
        // Add a blank line before the config if inserting before existing code.
        if (scriptLines[insertIndex] && scriptLines[insertIndex].trim() !== "") {
          scriptLines.splice(insertIndex, 0, "", ...configLinesToInsert);
        } else {
          // If inserting at the end of imports or into an empty line, no need for an extra blank line before.
          scriptLines.splice(insertIndex, 0, ...configLinesToInsert);
        }

        generatedScript = scriptLines.join('\n');
      }

      if (generatedScript !== undefined) {
        if (mode === 'simple') {
          // For simple mode, phasedOutputs might be relevant if the script produces them
          // However, the current llmResult from interactWithLLM doesn't include phasedOutputs
          // This might need adjustment if simple mode is expected to also return structured task outputs
          // directly from the /api/generate call, or if they are only handled by /api/execute
          return NextResponse.json({ generatedScript, fullPrompt: fullPrompt /* phasedOutputs: [] an example if needed */ });
        } else { // Advanced mode, phase 3
          return NextResponse.json({ generatedScript, phase: 3, fullPrompt: fullPrompt /* phasedOutputs: [] an example if needed */ });
        }
      } else {
        // This case should ideally not be reached if llmModel.startsWith('ollama/') and generatedScript was initially undefined,
        // as the injection logic itself checks for generatedScript.
        // However, if generatedScript was undefined from llmResult and it's not an Ollama model, this path is valid.
        console.error(`Error: generatedScript is undefined for mode='${mode}' and runPhase='${runPhase}'. This should not happen if a script was expected.`);
        return NextResponse.json({ error: "Failed to process LLM output for script generation." }, { status: 500 });
      }

    } catch (apiError) {
      console.error(`Error interacting with LLM for model ${llmModel}:`, apiError);
      const message = apiError instanceof Error ? apiError.message : String(apiError);
      return NextResponse.json({ error: message, fullPrompt: fullPrompt }, { status: 500 }); // Include fullPrompt for client debugging
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
