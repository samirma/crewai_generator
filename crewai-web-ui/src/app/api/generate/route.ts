import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
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

interface PhasedOutput {
  taskName: string;
  output: string;
}

function parsePhasedOutput(scriptStdout: string): PhasedOutput[] {
  const outputs: PhasedOutput[] = [];
  // Regex to capture task name and the output until the next marker or end of string.
  // Ensures taskName is captured from the marker.
  // Output is everything between the current marker and the next, or EOF.
  const regex = /### CREWAI_TASK_OUTPUT_MARKER: (.*?) ###\r?\n([\s\S]*?)(?=### CREWAI_TASK_OUTPUT_MARKER:|$)/g;
  let match;
  while ((match = regex.exec(scriptStdout)) !== null) {
    outputs.push({
      taskName: match[1].trim(),
      output: match[2].trim(),
    });
  }
  return outputs;
}

// Main API Handler
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initialInput, llmModel } = body;

    console.log(`Received input: "${initialInput}" for LLM: ${llmModel}`);

    // Standardize llmModel to lower case for consistent checks
    const currentModelId = llmModel.toLowerCase();
    let metaPrompt = ""; // To store content of crewai_reference.md
    let fullPrompt = "";   // To store the combined prompt for the LLM

    try {
      metaPrompt = await fs.readFile(path.join(process.cwd(), 'crewai_reference.md'), 'utf-8');
    } catch (fileError) {
      console.error("Error reading crewai_reference.md:", fileError);
      return NextResponse.json({ error: "Could not load the meta-prompt. Check server logs." }, { status: 500 });
    }

    // Construct the core part of the prompt, common across models
    // Specific instructions for phased output markers are crucial.
    const basePromptInstruction = `\n\nUser Instruction: ${initialInput}\n\nGenerate the Python script for CrewAI based on this. Ensure each task's output is clearly marked with '### CREWAI_TASK_OUTPUT_MARKER: <task_name> ###' on a new line, followed by the task's output on subsequent lines.`;
    fullPrompt = `${metaPrompt}${basePromptInstruction}`;


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

            let generatedScript = result.response.candidates[0].content.parts[0].text;
            console.log("Raw generated script from Gemini:", generatedScript);

            // Common script post-processing (e.g., extracting from markdown)
            if (generatedScript.includes('```python')) {
              const pythonCodeBlockRegex = /```python\n([\s\S]*?)\n```/;
              const match = generatedScript.match(pythonCodeBlockRegex);
              if (match && match[1]) {
                console.log("Extracted Python code from markdown block for Gemini.");
                generatedScript = match[1];
              }
            }

            console.log("Attempting to execute generated script in Docker (Gemini)...");
            const { stdout, stderr } = await executePythonScript(generatedScript);
            const phasedOutputs = parsePhasedOutput(stdout);

            return NextResponse.json({
                generatedScript,
                executionOutput: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
                phasedOutputs,
            });

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
    // Removed OpenAI handling block
    } else if (currentModelId.startsWith('deepseek/')) {
      // DEEPSEEK Handling
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        console.error("DEEPSEEK_API_KEY is not set for model:", llmModel);
        return NextResponse.json({ error: "DEEPSEEK_API_KEY is not configured for this model." }, { status: 500 });
      }

      console.log(`Using DeepSeek model ID: ${llmModel} for request.`);

      try {
        console.log("Calling DeepSeek API...");
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: llmModel, // Use the original llmModel which is like "deepseek/chat" or "deepseek/reasoner"
            messages: [{ role: "user", content: fullPrompt }],
            temperature: 0,
            stream: false, // Explicitly disable streaming as per assumptions
          }),
        });
        console.log("DeepSeek API call completed.");

        if (!response.ok) {
          const errorData = await response.json();
          console.error("DeepSeek API Error Data:", errorData);
          throw new Error(errorData.error?.message || `DeepSeek API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let generatedScript = data.choices?.[0]?.message?.content;

        if (!generatedScript) {
          console.error("DeepSeek API call successful but response format is unexpected or content is missing.", data);
          throw new Error("DeepSeek API Error: No content generated or unexpected response structure.");
        }
        console.log("Raw generated script from DeepSeek:", generatedScript);

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


        console.log("Attempting to execute generated script in Docker (DeepSeek)...");
        const { stdout, stderr } = await executePythonScript(generatedScript);
        const phasedOutputs = parsePhasedOutput(stdout);

        return NextResponse.json({
          generatedScript,
          executionOutput: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
          phasedOutputs,
        });

      } catch (apiError) {
        console.error(`Error calling DeepSeek API or executing script for model ${llmModel}:`, apiError);
        return NextResponse.json({ error: apiError instanceof Error ? apiError.message : String(apiError) }, { status: 500 });
      }
    } else {
      // Fallback for other/unhandled models
      console.log(`Falling back to mock response for unhandled model ${llmModel}.`);
      const mockPythonScript = `# Mock Python script for ${llmModel}\n# Input: ${initialInput}\nprint("Hello from mock Python script!")\n\n### CREWAI_TASK_OUTPUT_MARKER: Mock Task 1 ###\nOutput of Mock Task 1\n### CREWAI_TASK_OUTPUT_MARKER: Mock Task 2 ###\nOutput of Mock Task 2`;
      const { stdout, stderr } = await executePythonScript(mockPythonScript);
      const phasedOutputs = parsePhasedOutput(stdout);
      return NextResponse.json({
        generatedScript: mockPythonScript,
        executionOutput: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
        phasedOutputs: phasedOutputs,
      });
    }

  } catch (error) { // Catch-all for errors during request processing or unknown issues
    console.error("Error in API route:", error);
    let errorMessage = "An unknown error occurred in API route.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
