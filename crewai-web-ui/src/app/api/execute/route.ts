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

// Helper function to execute Python script in Docker
async function executePythonScript(scriptContent: string): Promise<ExecutionResult> {
  const docker = new Docker(); // Assumes Docker is accessible (e.g., /var/run/docker.sock)
  const projectRoot = path.resolve(process.cwd(), '..');
  const workspaceDir = path.join(projectRoot, 'workspace');

  const result: ExecutionResult = {
    overallStatus: 'success', // Assume success until a failure occurs
    preHostRun: { stdout: '', stderr: '', status: 'not_run' },
    preDockerRun: { stdout: '', stderr: '', status: 'not_run' },
    mainScript: { stdout: '', stderr: '', status: 'not_run' },
  };

  try {
    await fs.mkdir(workspaceDir, { recursive: true });
    const scriptPath = path.join(workspaceDir, 'crewai_generated.py');
    await fs.writeFile(scriptPath, scriptContent);
    console.log(`Python script saved to ${scriptPath}`);

    // --- Execute pre_host_run.sh if it exists ---
    const preHostRunScriptPath = path.join(workspaceDir, 'pre_host_run.sh');
    result.preHostRun!.status = 'running';
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
      result.preHostRun!.stdout = execResult.stdout;
      result.preHostRun!.stderr = execResult.stderr;
      result.preHostRun!.exitCode = execResult.exitCode;
      result.preHostRun!.status = 'success';
      console.log(`pre_host_run.sh stdout:\n${execResult.stdout}`);
      if (execResult.stderr) console.warn(`pre_host_run.sh stderr:\n${execResult.stderr}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        result.preHostRun!.status = 'skipped';
        console.log(`Host pre-run script (${preHostRunScriptPath}) not found. Skipping.`);
      } else {
        console.error(`Failed to execute pre_host_run.sh:`, error);
        result.preHostRun!.status = 'failure';
        result.preHostRun!.error = error.message || 'Unknown error';
        result.preHostRun!.stdout = error.stdout || '';
        result.preHostRun!.stderr = error.stderr || '';
        result.preHostRun!.exitCode = error.code || 1;
        result.overallStatus = 'failure';
        result.preDockerRun!.status = 'not_run';
        result.mainScript!.status = 'not_run';
        return result;
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
      result.error = `Docker image build failed: ${buildError.message}`;
      result.overallStatus = 'failure';
      result.preDockerRun!.status = 'not_run';
      result.mainScript!.status = 'not_run';
      return result;
    }

    // --- Docker Container Execution ---
    let containerStdout = '';
    let containerStderr = '';
    let containerStatusCode: number | undefined = undefined;

    try {
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
      const container = await docker.createContainer({
        Image: imageName,
        Cmd: ['/bin/sh', '-c', dockerCommand],
        WorkingDir: '/workspace',
        HostConfig: {
          Mounts: [{ Type: 'bind', Source: workspaceDir, Target: '/workspace' }],
          AutoRemove: true,
          ExtraHosts: ['host.docker.internal:host-gateway'], // Added this line
        },
        Env: ['OLLAMA_HOST=http://host.docker.internal:11434'], // Added this line
        Tty: false,
      });

      const stream = await container.attach({ stream: true, stdout: true, stderr: true });
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => {
        if (chunk.length > 8) {
          const type = chunk[0];
          const payload = chunk.slice(8);
          if (type === 1) stdoutChunks.push(payload);
          else if (type === 2) stderrChunks.push(payload);
        }
      });

      await container.start();
      console.log(`Container for ${imageName} started. Waiting for completion.`);
      const waitResponse = await container.wait();
      containerStatusCode = waitResponse.StatusCode;
      console.log(`Container for ${imageName} finished with status code: ${containerStatusCode}.`);

      containerStdout = Buffer.concat(stdoutChunks).toString('utf-8');
      containerStderr = Buffer.concat(stderrChunks).toString('utf-8');

    } catch (dockerErr: any) {
      console.error("Error running Python script in Docker:", dockerErr);
      result.overallStatus = 'failure';
      result.error = `Docker container error: ${dockerErr.message}`; // General error

      if (result.preDockerRun!.status === 'running') {
        result.preDockerRun!.status = 'failure';
        result.preDockerRun!.error = dockerErr.message;
        result.mainScript!.status = 'not_run'; // Main script didn't get a chance if pre-docker was running
      } else if (result.mainScript!.status === 'running') {
        result.mainScript!.status = 'failure';
        result.mainScript!.error = dockerErr.message;
      } else {
        // If neither was 'running', the error is more general (e.g. createContainer failed)
        // Mark both as not_run if they weren't already failed/skipped from host-side
        if(result.preDockerRun!.status === 'not_run') result.preDockerRun!.error = `Container creation/startup failed: ${dockerErr.message}`;
        if(result.mainScript!.status === 'not_run' && result.preDockerRun!.status !== 'failure') result.mainScript!.error = `Container creation/startup failed, main script did not run: ${dockerErr.message}`;
      }
      return result;
    }

    // --- Parse Container Output ---
    result.preDockerRun = { stdout: '', stderr: '', status: 'not_run', exitCode: undefined };
    result.mainScript = { stdout: '', stderr: containerStderr, status: 'not_run', exitCode: undefined };

    const PRE_DOCKER_START_MARKER = "--- Running pre_docker_run.sh ---";
    const PRE_DOCKER_END_MARKER_PREFIX = "--- pre_docker_run.sh finished with exit code ";
    const PRE_DOCKER_SKIP_MARKER = "--- /workspace/pre_docker_run.sh not found, skipping. ---";
    const MAIN_SCRIPT_START_MARKER = "--- Running crewai_generated.py ---";
    const MAIN_SCRIPT_END_MARKER = "--- crewai_generated.py finished ---";

    let preDockerRunOutput = "";
    let mainScriptOutputCandidate = containerStdout; // Initially, all output could be for main script

    const preDockerSkipIdx = containerStdout.indexOf(PRE_DOCKER_SKIP_MARKER);
    const preDockerStartIdx = containerStdout.indexOf(PRE_DOCKER_START_MARKER);

    if (preDockerSkipIdx !== -1 && (preDockerStartIdx === -1 || preDockerSkipIdx < preDockerStartIdx)) {
      result.preDockerRun.status = 'skipped';
      mainScriptOutputCandidate = containerStdout.substring(preDockerSkipIdx + PRE_DOCKER_SKIP_MARKER.length);
    } else if (preDockerStartIdx !== -1) {
      result.preDockerRun.status = 'running'; // Tentative status
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
          result.overallStatus = 'failure';
          result.mainScript.status = 'not_run';
        }
      } else {
        // Pre-docker script started but didn't finish with its specific marker
        // Does it run into the main script start marker?
        const mainScriptStartAfterPreDockerStart = containerStdout.indexOf(MAIN_SCRIPT_START_MARKER, preDockerContentStart);
        if (mainScriptStartAfterPreDockerStart !== -1) {
            preDockerRunOutput = containerStdout.substring(preDockerContentStart, mainScriptStartAfterPreDockerStart).trim();
            // Status remains 'running' for now, will be 'failure' if container exit code is non-zero
            // or if it's 0, it'll be promoted to 'success' (implying it ran ok but marker was missing)
            mainScriptOutputCandidate = containerStdout.substring(mainScriptStartAfterPreDockerStart);
        } else {
            // Pre-docker started, no end marker, and no main script start marker after it. All remaining output is its.
            preDockerRunOutput = containerStdout.substring(preDockerContentStart).trim();
            mainScriptOutputCandidate = ""; // No output left for main script
        }
        // If no proper end marker, status is 'running' or potentially 'failure' later based on container exit
      }
      result.preDockerRun.stdout = preDockerRunOutput;
    }
    // If preDockerRun never even started (no skip, no start marker), mainScriptOutputCandidate remains containerStdout

    // Process Main Script Output (only if preDockerRun didn't critically fail)
    if (result.overallStatus === 'success') {
      result.mainScript.status = 'running'; // Tentative, assuming it will run or attempt to
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
        // If preDockerRun was 'success' or 'skipped', this is an issue.
        if (result.preDockerRun.status === 'success' || result.preDockerRun.status === 'skipped') {
            result.mainScript.status = 'failure';
            result.mainScript.error = "Main script start marker not found.";
            // If there's any remaining output in mainScriptOutputCandidate, assign it as stdout despite missing markers.
            // This helps capture output if markers are accidentally omitted by the script.
            if (mainScriptOutputCandidate.trim()) {
                 result.mainScript.stdout = mainScriptOutputCandidate.trim();
            }
            result.overallStatus = 'failure';
        } else {
            // preDockerRun might be 'not_run' or 'running' (implying it consumed everything or failed early)
            // In this case, mainScript is effectively 'not_run' or its status depends on preDockerRun's final state.
            result.mainScript.status = 'not_run';
        }
      }
    }

    // Final status check using container's exit code
    if (containerStatusCode === 0) {
      if (result.overallStatus === 'success') { // Ensure no prior critical failure (like preHostRun)
        result.overallStatus = 'success'; // Explicitly confirm

        // If preDockerRun was 'running' (e.g. missing end marker) or 'not_run' but script existed, it's now success.
        if (result.preDockerRun.status === 'running' || (result.preDockerRun.status === 'not_run' && preDockerStartIdx !== -1) ) {
          result.preDockerRun.status = 'success';
          result.preDockerRun.exitCode = 0;
        }
        // If mainScript was 'running' or 'not_run' (and preDockerRun was ok), it's now success.
        if (result.mainScript.status === 'running' ||
            (result.mainScript.status === 'not_run' && (result.preDockerRun.status === 'success' || result.preDockerRun.status === 'skipped'))) {
          result.mainScript.status = 'success';
          result.mainScript.exitCode = 0;
          // If mainScript.stdout is empty AND mainScriptOutputCandidate has content AND mainScript start marker was NOT found
          // (implies script ran but produced output without hitting markers)
          if (!result.mainScript.stdout && mainScriptOutputCandidate.trim() && mainScriptOutputCandidate.indexOf(MAIN_SCRIPT_START_MARKER) === -1) {
              if(mainScriptOutputCandidate.indexOf(PRE_DOCKER_START_MARKER) === -1 && mainScriptOutputCandidate.indexOf(PRE_DOCKER_SKIP_MARKER) === -1 ) {
                 // Avoid assigning preDocker output to mainScript if preDocker markers were also missing
                 result.mainScript.stdout = mainScriptOutputCandidate.trim();
              }
          }
        }
      }
    } else if (containerStatusCode !== undefined) { // Non-zero exit code
      if (result.overallStatus === 'success') {
        result.overallStatus = 'failure'; // Default to failure if not already set
        if (result.preDockerRun.status === 'running') {
            result.preDockerRun.status = 'failure';
            result.preDockerRun.exitCode = containerStatusCode;
            if (!result.preDockerRun.error) result.preDockerRun.error = `pre_docker_run.sh did not finish as expected and container exited with code ${containerStatusCode}.`;
            result.mainScript.status = 'not_run';
        } else if (result.mainScript.status === 'success' || result.mainScript.status === 'running') {
            result.mainScript.status = 'failure';
            result.mainScript.exitCode = containerStatusCode;
            if (!result.mainScript.error) result.mainScript.error = `Script execution failed with container exit code ${containerStatusCode}.`;
        } else if (result.preDockerRun.status === 'success' || result.preDockerRun.status === 'skipped') {
            result.mainScript.status = 'failure';
            result.mainScript.exitCode = containerStatusCode;
            if (!result.mainScript.error) result.mainScript.error = `Main script execution failed or did not run as expected (container exit code ${containerStatusCode}).`;
        } else {
            // If preDockerRun also failed and set its exit code, that's fine.
            // If no specific stage was 'running' or 'success', the top-level 'error' (if any) or this becomes the main error.
            if (!result.error) result.error = `Container exited with code ${containerStatusCode}.`;
        }
      }
    }

    // Final consolidation of overallStatus based on stage statuses
    if (result.preHostRun?.status === 'failure' ||
        result.preDockerRun?.status === 'failure' ||
        result.mainScript?.status === 'failure') {
      result.overallStatus = 'failure';
    }

    if (result.overallStatus === 'failure' && !result.error) {
        // If overallStatus is failure but no top-level error is set, try to find a stage-specific error.
        if (result.mainScript?.status === 'failure' && result.mainScript?.error) {
            result.error = result.mainScript.error;
        } else if (result.preDockerRun?.status === 'failure' && result.preDockerRun?.error) {
            result.error = result.preDockerRun.error;
        } else if (result.preHostRun?.status === 'failure' && result.preHostRun?.error) {
            result.error = result.preHostRun.error;
        } else {
            result.error = "An unspecified error occurred during execution. Check stage details.";
        }
    }


  } catch (topLevelError: any) {
    console.error("Top-level error in executePythonScript:", topLevelError);
    result.error = `Unhandled error: ${topLevelError.message}`;
    result.overallStatus = 'failure';
  }

  console.log("Python script execution result:", JSON.stringify(result, null, 2));
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scriptContent = body.script;

    if (!scriptContent || typeof scriptContent !== 'string') {
      const errorResult: ExecutionResult = {
        overallStatus: 'failure',
        error: "scriptContent is required in the request body and must be a string."
      };
      return NextResponse.json(errorResult, { status: 400 });
    }

    console.log("Received script for direct execution.");
    const result = await executePythonScript(scriptContent);

    // Determine appropriate HTTP status code based on overallStatus
    const httpStatus = result.overallStatus === 'failure' ? 500 : 200;
    if (result.overallStatus === 'failure' && !result.error) {
        if (result.mainScript?.status === 'failure' && result.mainScript?.error) result.error = result.mainScript.error;
        else if (result.preDockerRun?.status === 'failure' && result.preDockerRun?.error) result.error = result.preDockerRun.error;
        else if (result.preHostRun?.status === 'failure' && result.preHostRun?.error) result.error = result.preHostRun.error;
        else result.error = "Execution failed. Check stage outputs for details.";
    }


    return NextResponse.json(result, { status: httpStatus });

  } catch (error: any) {
    console.error("Error in /api/execute POST handler:", error);
    const errorResult: ExecutionResult = {
      overallStatus: 'failure',
      error: error.message || "An unknown error occurred in the API endpoint."
    };
    return NextResponse.json(errorResult, { status: 500 });
  }
}
