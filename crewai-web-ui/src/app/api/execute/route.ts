import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import Docker from 'dockerode';
import { exec } from 'child_process'; // For docker build command

interface StageOutput {
  stdout: string;
  stderr: string;
  status: 'success' | 'failure' | 'skipped' | 'not_run' | 'running';
  exitCode?: number;
  error?: string; // For errors in launching the stage, not script's own stderr
}

interface ExecutionResult {
  preHostRun?: StageOutput;
  preDockerRun?: StageOutput;
  mainScript?: StageOutput;
  overallStatus: 'success' | 'failure';
  error?: string; // For top-level errors like Docker build failure or unhandled exceptions
}

// Interface for the return type of the modified executePythonScript
interface ExecutePythonScriptSetupResult {
  container?: Docker.Container; // Optional because creation might fail
  stream?: NodeJS.ReadableStream; // Optional because attach might fail or not be reached
  preHostRunResult: StageOutput;
  overallStatus: 'success' | 'failure';
  error?: string;
  dockerCommand?: string;
}

// Modified function to process collected Docker output and finalize execution
async function processDockerStreamAndFinalize(
  containerStdout: string, // Changed from stream
  containerStderr: string, // Changed from stream
  containerStatusCode: number, // Added
  preHostRunResult: StageOutput,
  initialOverallStatus: 'success' | 'failure', // This reflects status *before* docker execution
  initialResultError?: string     // Error from pre-docker stages
): Promise<ExecutionResult> {

  const result: ExecutionResult = {
    preHostRun: preHostRunResult,
    preDockerRun: { stdout: '', stderr: '', status: 'not_run' },
    mainScript: { stdout: '', stderr: '', status: 'not_run' },
    overallStatus: initialOverallStatus, // This will be 'success' if pre-host run was ok
    error: initialResultError, // Error from pre-host run, if any
  };

  // If pre-host run already failed, we reflect that and don't parse docker output
  if (result.overallStatus === 'failure') {
    result.preDockerRun!.status = 'skipped';
    result.mainScript!.status = 'skipped';
    // The error should already be set from initialResultError
    return result;
  }

  // --- Parse Container Output ---
  // Initialize with containerStderr for mainScript, as it captures all stderr if not separated.
  // Note: containerStdout and containerStderr are now passed as strings.
  result.preDockerRun = { stdout: '', stderr: '', status: 'not_run', exitCode: undefined };
  result.mainScript = { stdout: '', stderr: containerStderr, status: 'not_run', exitCode: undefined };

  const PRE_DOCKER_START_MARKER = "--- Running pre_docker_run.sh ---";
  const PRE_DOCKER_END_MARKER_PREFIX = "--- pre_docker_run.sh finished with exit code ";
  const PRE_DOCKER_SKIP_MARKER = "--- /workspace/pre_docker_run.sh not found, skipping. ---";
  const MAIN_SCRIPT_START_MARKER = "--- Running crewai_generated.py ---";
  const MAIN_SCRIPT_END_MARKER = "--- crewai_generated.py finished ---";

  let preDockerRunOutput = "";
  let mainScriptOutputCandidate = containerStdout; // Already a string

  const preDockerSkipIdx = containerStdout.indexOf(PRE_DOCKER_SKIP_MARKER);
  const preDockerStartIdx = containerStdout.indexOf(PRE_DOCKER_START_MARKER);

  if (preDockerSkipIdx !== -1 && (preDockerStartIdx === -1 || preDockerSkipIdx < preDockerStartIdx)) {
    result.preDockerRun.status = 'skipped';
    mainScriptOutputCandidate = containerStdout.substring(preDockerSkipIdx + PRE_DOCKER_SKIP_MARKER.length);
  } else if (preDockerStartIdx !== -1) {
    result.preDockerRun.status = 'running'; // Initial status, to be updated by exit code or markers
    const preDockerContentStart = preDockerStartIdx + PRE_DOCKER_START_MARKER.length;
    const endMarkerRegex = new RegExp(PRE_DOCKER_END_MARKER_PREFIX + "(\\d+) ---");
    const preDockerEndMatch = containerStdout.match(endMarkerRegex);

    if (preDockerEndMatch && preDockerEndMatch.index !== undefined && preDockerEndMatch.index > preDockerContentStart) {
      const endMarker = preDockerEndMatch[0];
      const exitCode = parseInt(preDockerEndMatch[1], 10);
      const preDockerContentEnd = preDockerEndMatch.index;
      preDockerRunOutput = containerStdout.substring(preDockerContentStart, preDockerContentEnd).trim();
      result.preDockerRun.exitCode = exitCode;
      result.preDockerRun.status = exitCode === 0 ? 'success' : 'failure';
      mainScriptOutputCandidate = containerStdout.substring(preDockerContentEnd + endMarker.length);
      if (exitCode !== 0) {
        // If pre_docker_run.sh fails, the overall status is failure, and main script is not run.
        result.overallStatus = 'failure';
        result.mainScript.status = 'not_run';
      }
    } else {
      // Pre-docker script started but didn't finish with its specific marker.
      // Check if it runs into the main script start marker.
      const mainScriptStartAfterPreDockerStart = containerStdout.indexOf(MAIN_SCRIPT_START_MARKER, preDockerContentStart);
      if (mainScriptStartAfterPreDockerStart !== -1) {
          preDockerRunOutput = containerStdout.substring(preDockerContentStart, mainScriptStartAfterPreDockerStart).trim();
          // Status will be determined by containerStatusCode if no explicit failure yet.
          mainScriptOutputCandidate = containerStdout.substring(mainScriptStartAfterPreDockerStart);
      } else {
          // Pre-docker started, no end marker, and no main script start marker after it. All remaining output is its.
          preDockerRunOutput = containerStdout.substring(preDockerContentStart).trim();
          mainScriptOutputCandidate = ""; // No output left for main script
      }
      // If no proper end marker, its status will be 'failure' if containerStatusCode is non-zero,
      // or 'success' if containerStatusCode is zero (implying it ran okay but markers were missing).
    }
    result.preDockerRun.stdout = preDockerRunOutput;
  }
  // If preDockerRun never even started (no skip, no start marker), its status remains 'not_run'.
  // mainScriptOutputCandidate remains the full containerStdout in this case.

  // Process Main Script Output (only if preDockerRun didn't critically fail and set overallStatus to failure)
  if (result.overallStatus === 'success') {
    result.mainScript.status = 'running'; // Initial status, assuming it will run or attempt to
    const mainScriptStartIdx = mainScriptOutputCandidate.indexOf(MAIN_SCRIPT_START_MARKER);
    if (mainScriptStartIdx !== -1) {
      const mainScriptContentStart = mainScriptStartIdx + MAIN_SCRIPT_START_MARKER.length;
      const mainScriptEndIdx = mainScriptOutputCandidate.indexOf(MAIN_SCRIPT_END_MARKER, mainScriptContentStart);

      if (mainScriptEndIdx !== -1) {
        result.mainScript.stdout = mainScriptOutputCandidate.substring(mainScriptContentStart, mainScriptEndIdx).trim();
        result.mainScript.status = 'success'; // Based on markers
      } else {
        // Main script started, but no end marker
        result.mainScript.stdout = mainScriptOutputCandidate.substring(mainScriptContentStart).trim();
        // Status remains 'running', to be finalized by container exit code
      }
    } else {
      // Main script start marker not found in its candidate string.
      // This is an issue if preDockerRun was 'success' or 'skipped'.
      if (result.preDockerRun.status === 'success' || result.preDockerRun.status === 'skipped') {
          result.mainScript.status = 'failure';
          result.mainScript.error = "Main script start marker not found.";
          if (mainScriptOutputCandidate.trim()) { // Capture output even if markers are missing
               result.mainScript.stdout = mainScriptOutputCandidate.trim();
          }
          result.overallStatus = 'failure';
      } else {
          // preDockerRun might be 'not_run', or 'running' (implying it consumed everything or failed early).
          // In this case, mainScript is effectively 'not_run'.
          result.mainScript.status = 'not_run';
      }
    }
  }

  // Final status check using container's exit code
  // This is crucial for stages that were 'running' or for overall script success/failure
  if (containerStatusCode === 0) {
    if (result.overallStatus === 'success') { // Ensure no prior critical failure (like preHostRun or preDockerRun explicit fail)
      result.overallStatus = 'success'; // Confirm overall success

      // If preDockerRun was 'running' (e.g., missing end marker) or 'not_run' but its start marker was found, it's now considered success.
      if (result.preDockerRun.status === 'running' || (result.preDockerRun.status === 'not_run' && preDockerStartIdx !== -1)) {
        result.preDockerRun.status = 'success';
        result.preDockerRun.exitCode = 0;
      }
      // If mainScript was 'running' (e.g., missing end marker), it's now success, provided preDockerRun was okay.
      if (result.mainScript.status === 'running' && (result.preDockerRun.status === 'success' || result.preDockerRun.status === 'skipped')) {
        result.mainScript.status = 'success';
        result.mainScript.exitCode = 0;
        // If mainScript.stdout is empty AND mainScriptOutputCandidate has content AND mainScript start marker was NOT found
        // (implies script ran but produced output without hitting markers, and preDocker also didn't claim it)
        if (!result.mainScript.stdout && mainScriptOutputCandidate.trim() &&
            mainScriptOutputCandidate.indexOf(MAIN_SCRIPT_START_MARKER) === -1 &&
            mainScriptOutputCandidate.indexOf(PRE_DOCKER_START_MARKER) === -1 &&
            mainScriptOutputCandidate.indexOf(PRE_DOCKER_SKIP_MARKER) === -1 ) {
           result.mainScript.stdout = mainScriptOutputCandidate.trim();
        }
      }
    }
    // If overallStatus was already 'failure' (e.g. pre_docker_run.sh failed with exit code), it remains failure.
  } else { // Non-zero containerStatusCode
    if (result.overallStatus === 'success') { // Only transition to failure if not already failed
      result.overallStatus = 'failure'; // Default to failure for the container

      // Attribute the failure to the appropriate stage if it was 'running' or 'success'
      if (result.preDockerRun.status === 'running') {
          result.preDockerRun.status = 'failure';
          result.preDockerRun.exitCode = containerStatusCode;
          if (!result.preDockerRun.error) result.preDockerRun.error = `pre_docker_run.sh did not finish as expected or failed; container exit code ${containerStatusCode}.`;
          result.mainScript.status = 'not_run'; // Main script didn't get a chance or its outcome is irrelevant
      } else if (result.mainScript.status === 'success' || result.mainScript.status === 'running') {
          // If preDockerRun was success/skipped, but main script was running/success and container failed
          result.mainScript.status = 'failure';
          result.mainScript.exitCode = containerStatusCode;
          if (!result.mainScript.error) result.mainScript.error = `Script execution failed with container exit code ${containerStatusCode}.`;
      } else if (result.preDockerRun.status === 'success' || result.preDockerRun.status === 'skipped') {
          // If main script was 'not_run' or already 'failure' but without an exit code, and preDocker was fine
          result.mainScript.status = 'failure'; // Ensure it's failure
          result.mainScript.exitCode = containerStatusCode;
          if (!result.mainScript.error) result.mainScript.error = `Main script execution failed or did not run as expected (container exit code ${containerStatusCode}).`;
      } else {
          // Failure is general to the container, not specific to a script stage that was marked 'success' or 'running'
          // This could happen if preDockerRun was 'not_run' or 'skipped' and mainScript was also 'not_run'
          if (!result.error) result.error = `Container exited with code ${containerStatusCode}.`;
          // Ensure stages reflect this if they weren't already failed
          if (result.preDockerRun.status === 'not_run' && preDockerStartIdx !== -1) { // It was attempted
              result.preDockerRun.status = 'failure';
              result.preDockerRun.exitCode = containerStatusCode;
          }
           if (result.mainScript.status === 'not_run' && (result.preDockerRun.status === 'success' || result.preDockerRun.status === 'skipped' || preDockerStartIdx === -1)) { // It was attempted or preDocker skipped
              result.mainScript.status = 'failure';
              result.mainScript.exitCode = containerStatusCode;
           }
      }
    } else { // overallStatus was already 'failure' (e.g., from pre_docker_run.sh explicit fail).
        // Still record the container exit code for the stage that was likely running or caused it.
        if (result.preDockerRun?.status === 'failure' && !result.preDockerRun.exitCode) {
             result.preDockerRun.exitCode = containerStatusCode;
        } else if (result.mainScript?.status === 'failure' && !result.mainScript.exitCode) {
             result.mainScript.exitCode = containerStatusCode;
        }
        // If a specific script (preDockerRun) already set overallStatus to failure with its own exit code, that takes precedence.
    }
  }

  // Final consolidation of overallStatus based on stage statuses.
  // This is important if preHostRun failed, this ensures overallStatus remains failure.
  if (result.preHostRun?.status === 'failure' ||
      result.preDockerRun?.status === 'failure' ||
      result.mainScript?.status === 'failure') {
    result.overallStatus = 'failure';
  }

  // If overallStatus is failure but no top-level error is set, try to find a stage-specific error.
  if (result.overallStatus === 'failure' && !result.error) {
      if (result.mainScript?.status === 'failure' && result.mainScript?.error) {
          result.error = result.mainScript.error;
      } else if (result.preDockerRun?.status === 'failure' && result.preDockerRun?.error) {
          result.error = result.preDockerRun.error;
      } else if (result.preHostRun?.status === 'failure' && result.preHostRun?.error) { // This should have been set by initialResultError
          result.error = result.preHostRun.error;
      } else if (containerStatusCode !== 0) { // Default if no specific script error message
          result.error = `Container exited with status code ${containerStatusCode}. Check logs for details.`;
      } else {
          result.error = "An unspecified error occurred during execution. Check stage details.";
      }
  }
  // console.log("Processed execution result (after parsing):", JSON.stringify(result, null, 2));
  return result;
}

// Helper function to execute Python script in Docker
async function executePythonScript(scriptContent: string): Promise<ExecutePythonScriptSetupResult> { // Changed return type
  const docker = new Docker(); // Assumes Docker is accessible (e.g., /var/run/docker.sock)
  const projectRoot = path.resolve(process.cwd(), '..');
  const workspaceDir = path.join(projectRoot, 'workspace');

  // Initialize preHostRunResult for the return value
  const preHostRunResult: StageOutput = { stdout: '', stderr: '', status: 'not_run' };
  let overallStatus: 'success' | 'failure' = 'success';
  let topLevelError: string | undefined = undefined;

  try {
    await fs.mkdir(workspaceDir, { recursive: true });
    const scriptPath = path.join(workspaceDir, 'crewai_generated.py');
    await fs.writeFile(scriptPath, scriptContent);
    console.log(`Python script saved to ${scriptPath}`);

    // --- Execute pre_host_run.sh if it exists ---
    const preHostRunScriptPath = path.join(workspaceDir, 'pre_host_run.sh');
    preHostRunResult.status = 'running';
    try {
      await fs.access(preHostRunScriptPath, fs.constants.F_OK);
      console.log(`Executing host pre-run script: ${preHostRunScriptPath}`);
      const execResult = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
        exec(`sh ${preHostRunScriptPath}`, { cwd: workspaceDir }, (error, stdout, stderr) => {
          if (error) {
            // @ts-ignore
            error.stdout = stdout;
            // @ts-ignore
            error.stderr = stderr;
            reject(error);
          } else {
            resolve({ stdout, stderr, exitCode: 0 });
          }
        });
      });
      preHostRunResult.stdout = execResult.stdout;
      preHostRunResult.stderr = execResult.stderr;
      preHostRunResult.exitCode = execResult.exitCode;
      preHostRunResult.status = 'success';
      console.log(`pre_host_run.sh stdout:\n${execResult.stdout}`);
      if (execResult.stderr) console.warn(`pre_host_run.sh stderr:\n${execResult.stderr}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        preHostRunResult.status = 'skipped';
        console.log(`Host pre-run script (${preHostRunScriptPath}) not found. Skipping.`);
      } else {
        console.error(`Failed to execute pre_host_run.sh:`, error);
        preHostRunResult.status = 'failure';
        preHostRunResult.error = error.message || 'Unknown error';
        preHostRunResult.stdout = error.stdout || '';
        preHostRunResult.stderr = error.stderr || '';
        preHostRunResult.exitCode = error.code || 1;
        overallStatus = 'failure';
        topLevelError = `Pre-host run script failed: ${error.message}`;
        // Early exit for pre-host run failure
        return { preHostRunResult, overallStatus, error: topLevelError };
      }
    }

    // --- Docker Image Build ---
    const imageName = 'python-runner';
    console.log(`Attempting to build Docker image '${imageName}' from ${projectRoot}/python-runner`);
    try {
      await new Promise<void>((resolve, reject) => {
        exec(`docker build -t ${imageName} ./python-runner`, { cwd: projectRoot }, (err, stdout, stderr) => {
          if (err) {
            console.error(`Error building ${imageName} image:`, stderr);
            return reject(new Error(`Failed to build ${imageName}: ${stderr}`));
          }
          console.log(`${imageName} image build process output:`, stdout);
          resolve();
        });
      });
    } catch (buildError: any) {
      console.error(`Critical failure to build ${imageName} image:`, buildError);
      overallStatus = 'failure';
      topLevelError = `Docker image build failed: ${buildError.message}`;
      // Early exit for Docker build failure
    return { preHostRunResult, overallStatus, error: topLevelError, dockerCommand: "" }; // Return empty dockerCommand on failure
    }

    // --- Docker Container Setup ---
    const dockerCommand = `
  if [ -f /workspace/pre_docker_run.sh ]; then
    echo "--- Running pre_docker_run.sh ---";
    /bin/sh /workspace/pre_docker_run.sh;
    PRE_DOCKER_RUN_EXIT_CODE=$?;
    echo "--- pre_docker_run.sh finished with exit code $PRE_DOCKER_RUN_EXIT_CODE ---";
    if [ $PRE_DOCKER_RUN_EXIT_CODE -ne 0 ]; then exit $PRE_DOCKER_RUN_EXIT_CODE; fi;
  else
    echo "--- /workspace/pre_docker_run.sh not found, skipping. ---";
  fi &&
  echo "--- Running crewai_generated.py ---" &&
  python /workspace/crewai_generated.py &&
  echo "--- crewai_generated.py finished ---"
`;
    try {
      const container = await docker.createContainer({
        Image: imageName,
        Cmd: ['/bin/sh', '-c', dockerCommand], // dockerCommand is defined above
        WorkingDir: '/workspace',
        HostConfig: {
          Mounts: [{ Type: 'bind', Source: workspaceDir, Target: '/workspace' }],
          AutoRemove: true,
          ExtraHosts: ['host.docker.internal:host-gateway'],
        },
        Env: ['OLLAMA_HOST=http://host.docker.internal:11434'],
        Tty: false,
      });

      const stream = await container.attach({ stream: true, stdout: true, stderr: true });

      // Start the container before returning the stream
      await container.start();
      console.log(`Container for ${imageName} started.`);

      return { container, stream, preHostRunResult, overallStatus, dockerCommand }; // Return dockerCommand

    } catch (dockerErr: any) {
      console.error("Error setting up or starting Docker container:", dockerErr);
      overallStatus = 'failure';
      topLevelError = `Docker container setup/start error: ${dockerErr.message}`;
      return { preHostRunResult, overallStatus, error: topLevelError, dockerCommand }; // Return dockerCommand even on error
    }

  } catch (topLevelCatchError: any) { // Catch errors from fs operations, etc.
    console.error("Top-level error in executePythonScript setup:", topLevelCatchError);
    overallStatus = 'failure';
    topLevelError = `Unhandled setup error: ${topLevelCatchError.message}`;
    // In this case, dockerCommand might not have been defined, so ensure it's part of the return if needed or set to empty
    return { preHostRunResult, overallStatus, error: topLevelError, dockerCommand: "" };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scriptContent = body.script;

    if (!scriptContent || typeof scriptContent !== 'string') {
      const errorResult: ExecutionResult = { // Still use ExecutionResult for final API response
        preHostRun: { stdout: '', stderr: '', status: 'skipped', error: "scriptContent is required"},
        overallStatus: 'failure',
        error: "scriptContent is required in the request body and must be a string."
      };
      return NextResponse.json(errorResult, { status: 400 });
    }

    console.log("Received script for execution. Setting up Docker container and stream...");
    const setupResult = await executePythonScript(scriptContent);

    // If setup failed (e.g., pre-host, docker build, container creation failed)
    if (setupResult.overallStatus === 'failure' || !setupResult.container || !setupResult.stream) {
      console.error("Failed to setup Docker execution:", setupResult.error);
      const finalErrorResult: ExecutionResult = {
        preHostRun: setupResult.preHostRunResult,
        // preDockerRun and mainScript might not have been attempted, initialize them
        preDockerRun: { stdout: '', stderr: '', status: 'not_run', error: setupResult.error ? "Skipped due to setup failure" : undefined },
        mainScript: { stdout: '', stderr: '', status: 'not_run', error: setupResult.error ? "Skipped due to setup failure" : undefined },
        overallStatus: 'failure',
        error: setupResult.error || "Unknown error during setup phase.",
      };
      return NextResponse.json(finalErrorResult, { status: 500 });
    }

    console.log("Docker setup successful. Starting to stream logs and process final result...");

    const { container, stream: dockerStream, preHostRunResult, overallStatus: setupOverallStatus, error: setupError, dockerCommand: retrievedDockerCommand } = setupResult;

    const readableStream = new ReadableStream({
      async start(controller) {
        if (retrievedDockerCommand) {
          controller.enqueue(`DOCKER_COMMAND: ${retrievedDockerCommand}\n`);
        }

        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];

        dockerStream!.on('data', (chunk: Buffer) => {
          try {
            if (chunk.length > 8) {
              const type = chunk[0];
              const payload = chunk.slice(8);
              const payloadString = payload.toString('utf-8');

              // Server-side console logging (as per new feedback)
              if (type === 2) { // stderr
                // ANSI escape code for red text
                console.log(`[31m%s[0m`, payloadString.endsWith('\n') ? payloadString.slice(0, -1) : payloadString);
              } else { // stdout and other types
                console.log(payloadString.endsWith('\n') ? payloadString.slice(0, -1) : payloadString);
              }

              // Existing client-side enqueue logic
              if (type === 1) { // stdout
                controller.enqueue(`LOG: ${payloadString}`);
                stdoutChunks.push(payload);
              } else if (type === 2) { // stderr
                controller.enqueue(`LOG_ERROR: ${payloadString}`);
                stderrChunks.push(payload);
              } else {
                controller.enqueue(`LOG_UNKNOWN_TYPE_${type}: ${payloadString}`);
                // Still collect unknown types in stdout for now, or create a separate bucket
                stdoutChunks.push(payload);
              }
            } else {
              // For very short chunks (unexpected with TTY=false, but handle defensively)
              const rawChunkStr = chunk.toString('utf-8');
              // Server-side log for raw/short chunk
              console.log(rawChunkStr.endsWith('\n') ? rawChunkStr.slice(0, -1) : rawChunkStr);
              // Client-side enqueue for raw/short chunk
              controller.enqueue(`LOG_RAW: ${rawChunkStr}`);
              // Collect raw chunks in stdout for now
              stdoutChunks.push(chunk);
            }
          } catch (e: any) {
            console.error("Error processing chunk for client stream or server log:", e);
            controller.enqueue(`LOG_ERROR: Error processing Docker log chunk: ${e.message}`);
          }
        });

        dockerStream!.on('end', async () => {
          try {
            console.log("Docker stream ended. Waiting for container to exit...");
            const waitResponse = await container!.wait(); // container is guaranteed to be defined if stream is
            const containerStatusCode = waitResponse.StatusCode;
            console.log(`Container exited with status code: ${containerStatusCode}.`);

            const containerStdout = Buffer.concat(stdoutChunks).toString('utf-8');
            const containerStderr = Buffer.concat(stderrChunks).toString('utf-8');

            const finalResult = await processDockerStreamAndFinalize(
              containerStdout,
              containerStderr,
              containerStatusCode,
              preHostRunResult,
              setupOverallStatus, // Status from pre-host run and docker build
              setupError          // Error from pre-host run and docker build
            );

            controller.enqueue(`RESULT: ${JSON.stringify(finalResult)}`);
            controller.close();
          } catch (e: any) {
            console.error("Error in stream 'end' processing or finalization:", e);
            // Send a final error to the client if possible
            const errorResult: ExecutionResult = {
              overallStatus: 'failure',
              error: `Error during final processing: ${e.message}`,
              preHostRun: preHostRunResult,
              preDockerRun: { stdout: Buffer.concat(stdoutChunks).toString('utf-8'), stderr: Buffer.concat(stderrChunks).toString('utf-8'), status: 'unknown', error: `Error during final processing: ${e.message}` },
              mainScript: { stdout: '', stderr: '', status: 'unknown', error: `Error during final processing: ${e.message}` },
            };
            try {
              controller.enqueue(`RESULT: ${JSON.stringify(errorResult)}`);
            } catch (enqueueError) {
              console.error("Failed to enqueue final error result:", enqueueError);
            }
            controller.close();
          }
        });

        dockerStream!.on('error', (err) => {
          console.error("Docker stream error:", err);
          // Try to send an error message over the stream before closing it with an error.
          const errorResult: ExecutionResult = {
            overallStatus: 'failure',
            error: `Docker stream error: ${err.message}`,
            preHostRun: preHostRunResult,
            preDockerRun: { stdout: Buffer.concat(stdoutChunks).toString('utf-8'), stderr: Buffer.concat(stderrChunks).toString('utf-8'), status: 'failure', error: `Docker stream error: ${err.message}` },
            mainScript: { stdout: '', stderr: '', status: 'not_run' },
          };
          try {
            controller.enqueue(`RESULT: ${JSON.stringify(errorResult)}`);
          } catch (enqueueError) {
             console.error("Failed to enqueue stream error result:", enqueueError);
          }
          controller.error(err); // Close the stream with an error
        });
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff', // Important for security with text/plain
        // 'Transfer-Encoding': 'chunked', // Next.js handles this automatically for ReadableStream responses
      }
    });

  } catch (error: any) {
    // This catches errors in the POST handler's initial setup,
    // or if executePythonScript itself throws before returning (should be caught internally by it)
    console.error("Critical Error in /api/execute POST handler:", error);
    const errorResult: ExecutionResult = {
      overallStatus: 'failure',
      error: error.message || "An unknown error occurred in the API endpoint."
    };
    return NextResponse.json(errorResult, { status: 500 });
  }
}
