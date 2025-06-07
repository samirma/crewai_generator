import { NextResponse } from 'next/server';
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
  console.log(`Attempting to build Docker image '${imageName}' from ${projectRoot}/python-runner for direct execution`);

  try {
    await new Promise<void>((resolve, reject) => {
      // It's important that the Dockerfile for 'python-runner' is in the 'python-runner' directory
      // at the project root.
      exec(`docker build -t ${imageName} ./python-runner`, { cwd: projectRoot }, (err, stdout, stderr) => {
        if (err) {
          console.error(`Error building ${imageName} image during direct execution:`, stderr);
          // Check if the error is due to an actual build failure vs. other issues
          if (stderr.includes("ERROR: failed to solve") || stderr.includes("failed to build")) {
             return reject(new Error(`Failed to build ${imageName}: ${stderr}`));
          }
          // Log non-critical errors/warnings but proceed, image might exist or be cached.
          console.warn(`Warning/Error during ${imageName} build (might be okay if image already exists or due to caching):`, stderr);
        }
        console.log(`${imageName} image build process output (or already exists) for direct execution:`, stdout);
        resolve();
      });
    });
  } catch (buildError) {
    console.error(`Critical failure to build ${imageName} image during direct execution:`, buildError);
    await fs.rm(tempDir, { recursive: true, force: true });
    // If build fails critically, we cannot proceed.
    throw new Error(`Critical Docker image build failure for ${imageName}: ${buildError instanceof Error ? buildError.message : String(buildError)}`);
  }

  let stdout = '';
  let stderr = '';

  try {
    console.log(`Creating Docker container for image '${imageName}' with script from ${tempDir} for direct execution`);
    const container = await docker.createContainer({
      Image: imageName,
      Cmd: ['python', '/run/script_dir/script.py'],
      WorkingDir: '/workspace',
      HostConfig: {
        Mounts: [
          {
            Type: 'bind',
            Source: tempDir,
            Target: '/run/script_dir'
          },
          {
            Type: 'bind',
            Source: path.resolve(projectRoot, 'workspace'),
            Target: '/workspace'
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
    console.log(`Container for ${imageName} started for direct execution. Waiting for completion.`);
    await container.wait();
    console.log(`Container for ${imageName} finished direct execution.`);

    stdout = Buffer.concat(stdoutChunks).toString('utf-8');
    stderr = Buffer.concat(stderrChunks).toString('utf-8');

  } catch (err) {
    console.error("Error running Python script in Docker during direct execution:", err);
    stderr += `\nError executing script in Docker: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    console.log(`Cleaning up temporary directory: ${tempDir} after direct execution`);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
  console.log("Python script direct execution stdout:", stdout);
  console.log("Python script direct execution stderr:", stderr);
  return { stdout, stderr };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scriptContent = body.script; // Matches the key sent from the frontend

    if (!scriptContent || typeof scriptContent !== 'string') {
      return NextResponse.json({ error: "scriptContent is required in the request body and must be a string." }, { status: 400 });
    }

    console.log("Received script for direct execution.");
    // The `executePythonScript` function is designed to handle potential errors.
    const { stdout, stderr } = await executePythonScript(scriptContent);

    // The frontend expects an 'output' field for successful execution.
    // We can combine stdout and stderr or choose one.
    // For now, let's send both, but the frontend was expecting `data.output` for success.
    // Let's prioritize stdout for the `output` field and include stderr separately.
    // Or, if the frontend's `handleExecuteScript` expects `data.output` to be the primary result,
    // we should structure it that way. The previous frontend code was `setScriptRunOutput(data.output);`
    // Let's assume `output` should be primarily `stdout` and `stderr` can be for errors or additional info.

    // If there's significant stderr, it might indicate an execution error even if stdout has content.
    // However, some scripts might write to stderr for logging successfully.
    // For simplicity, we return both. The frontend can decide how to display them.
    // The prompt asked for NextResponse.json({ stdout, stderr })
    // The frontend was `setScriptRunOutput(data.output);`
    // Let's adjust to provide `output` as a combination for `scriptRunOutput`
    // and keep `stderr` for detailed error diagnosis if needed.

    let output = stdout;
    if (stderr) {
      output += `\n\n--- STDERR ---\n${stderr}`;
    }

    return NextResponse.json({ output: output, stdout: stdout, stderr: stderr });

  } catch (error) {
    console.error("Error in /api/execute route:", error);
    let errorMessage = "An unknown error occurred while executing the script.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Ensure the response for errors also matches what the client might expect,
    // or set a clear error structure. The client `handleExecuteScript` sets `scriptExecutionError`
    // from `errorData.error`.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
