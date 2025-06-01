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


// Main API Handler
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initialInput, llmModel } = body;

    console.log(`Received input: "${initialInput}" for LLM: ${llmModel}`);

    if (llmModel.toLowerCase() === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not set.");
        return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
      }

      const filePath = path.join(process.cwd(), 'crewai_reference.md');
      let metaPrompt = "";
      try {
        metaPrompt = await fs.readFile(filePath, 'utf-8');
      } catch (fileError) {
        console.error("Error reading crewai_reference.md:", fileError);
        console.error("Current working directory (process.cwd()):", process.cwd());
        return NextResponse.json({ error: "Could not load the meta-prompt. Check server logs for details." }, { status: 500 });
      }

      const fullPrompt = `${metaPrompt}\n\nUser Instruction: ${initialInput}\n\nGenerate the Python script based on this.`;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
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
        });
        console.log("Gemini API call completed.");

        if (result.response && result.response.candidates && result.response.candidates.length > 0 &&
            result.response.candidates[0].content && result.response.candidates[0].content.parts &&
            result.response.candidates[0].content.parts.length > 0 &&
            result.response.candidates[0].content.parts[0].text) {

            let generatedScript = result.response.candidates[0].content.parts[0].text;
            console.log("Raw generated script from Gemini:", generatedScript);

            if (!generatedScript.trim().startsWith("def ") && !generatedScript.trim().startsWith("import ") && !generatedScript.trim().startsWith("#") && !generatedScript.trim().startsWith("print") && !generatedScript.trim().startsWith("\"\"\"")  && !generatedScript.trim().startsWith("'''")) {
                console.warn("Gemini response might not be Python code, attempting to extract from markdown block.");
                const pythonCodeBlockRegex = /```python\n([\s\S]*?)\n```/;
                const match = generatedScript.match(pythonCodeBlockRegex);
                if (match && match[1]) {
                    console.log("Extracted Python code from markdown block.");
                    generatedScript = match[1];
                } else {
                    console.warn("Could not extract Python code from markdown block. Using raw output.");
                }
            }

            console.log("Attempting to execute generated script in Docker...");
            const { stdout, stderr } = await executePythonScript(generatedScript);
            console.log("Script execution finished. Returning response.");

            return NextResponse.json({
                generatedScript: generatedScript,
                executionOutput: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
            });

        } else {
          console.error("Gemini API call successful but response format is unexpected or content is missing.");
          let detailedError = "No content generated or unexpected response structure.";
          if (result.response && result.response.promptFeedback) {
            detailedError += ` Prompt feedback: ${JSON.stringify(result.response.promptFeedback)}`;
            console.error("Prompt Feedback:", result.response.promptFeedback);
          } else {
            console.error("Full Gemini Response (or lack thereof):", JSON.stringify(result.response, null, 2));
          }
          return NextResponse.json({ error: `Gemini API Error: ${detailedError}` }, { status: 500 });
        }

      } catch (apiError) {
        console.error("Error calling Gemini API or executing script:", apiError);
        let errorMessage = "Failed to generate or execute script.";
        if (apiError instanceof Error) {
            errorMessage = apiError.message;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }

    } else {
      // Fallback for other models
      console.log(`Falling back to mock response for model ${llmModel}.`);
      const mockPythonScript = `# Mock Python script for ${llmModel}\n# Input: ${initialInput}\nprint("Hello from mock Python script!")`;
      const { stdout, stderr } = await executePythonScript(mockPythonScript);
      return NextResponse.json({
        generatedScript: mockPythonScript,
        executionOutput: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
      });
    }

  } catch (error) {
    console.error("Error in API route:", error);
    let errorMessage = "An unknown error occurred in API route.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
