import { Buffer } from 'buffer';
import { processDockerStreamAndFinalize } from './executionResult.service';
import { ExecutionResult, StageOutput } from './types'; // ExecutePythonScriptSetupResult is not directly used here

// We are using 'any' for container type for now to avoid direct dockerode dependency here.
// The actual type is Docker.Container.
// NodeJS.ReadableStream is generally available in Node environments.

import Docker from 'dockerode';
export function handleDockerStream(
  dockerStream: NodeJS.ReadableStream,
  container: Docker.Container, // Should be Docker.Container
  preHostRunResult: StageOutput,
  setupOverallStatus: 'success' | 'failure',
  setupError: string | undefined,
  retrievedDockerCommand: string | undefined,
  scriptStartTime: number // Added to receive the start time
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      if (retrievedDockerCommand) {
        controller.enqueue(`DOCKER_COMMAND: ${retrievedDockerCommand}\n`);
      }

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      // Markers for pre-Docker script log differentiation
      const PRE_DOCKER_START_MARKER = "--- Running pre_docker_run.sh ---";
      const PRE_DOCKER_END_MARKER_PREFIX = "--- pre_docker_run.sh finished with exit code ";
      const PRE_DOCKER_SKIP_MARKER = "--- /workspace/pre_docker_run.sh not found, skipping. ---";

      let inPreDockerScript = false;
      let preDockerScriptFinished = false;

      dockerStream!.on('data', (chunk: Buffer) => {
        try {
          if (chunk.length > 8) {
            const type = chunk[0]; // 1 for stdout, 2 for stderr
            const payload = chunk.slice(8);
            const payloadString = payload.toString('utf-8');

            // Server-side console logging (remains unchanged)
            if (type === 2) { // stderr
              console.log(`[31m%s[0m`, payloadString.endsWith('\n') ? payloadString.slice(0, -1) : payloadString);
            } else { // stdout
              console.log(payloadString.endsWith('\n') ? payloadString.slice(0, -1) : payloadString);
            }

            // Logic to identify pre-Docker script phase
            if (!preDockerScriptFinished) {
              if (payloadString.includes(PRE_DOCKER_START_MARKER)) {
                inPreDockerScript = true;
              }
              if (payloadString.includes(PRE_DOCKER_SKIP_MARKER)) {
                preDockerScriptFinished = true; // Script is skipped
                inPreDockerScript = false; // Ensure not in pre-docker if skipped
              }
              // Check if the payloadString itself starts with the end marker prefix,
              // not just contains it, to avoid partial matches within log lines.
              if (inPreDockerScript && payloadString.startsWith(PRE_DOCKER_END_MARKER_PREFIX)) {
                inPreDockerScript = false;
                preDockerScriptFinished = true;
              }
            }

            // Client-side enqueue logic with prefixing
            if (inPreDockerScript) {
              if (type === 1) { // stdout from pre-docker script
                controller.enqueue(`PRE_DOCKER_LOG: ${payloadString}`);
                stdoutChunks.push(payload); // Still collect for final processing
              } else if (type === 2) { // stderr from pre-docker script
                controller.enqueue(`PRE_DOCKER_ERROR: ${payloadString}`);
                stderrChunks.push(payload); // Still collect for final processing
              } else { // Should not happen with Docker's TTY stream format
                controller.enqueue(`PRE_DOCKER_UNKNOWN_TYPE_${type}: ${payloadString}`);
                stdoutChunks.push(payload);
              }
            } else { // Main script logs or logs after pre-docker script finished/skipped
              if (type === 1) { // stdout
                controller.enqueue(`LOG: ${payloadString}`);
                stdoutChunks.push(payload);
              } else if (type === 2) { // stderr
                controller.enqueue(`LOG_ERROR: ${payloadString}`);
                stderrChunks.push(payload);
              } else { // Should not happen
                controller.enqueue(`LOG_UNKNOWN_TYPE_${type}: ${payloadString}`);
                stdoutChunks.push(payload);
              }
            }
          } else { // For very short/raw chunks
            const rawChunkStr = chunk.toString('utf-8');
            console.log(rawChunkStr.endsWith('\n') ? rawChunkStr.slice(0, -1) : rawChunkStr); // Server log
            // For client, decide if these raw chunks also need pre-docker prefixing,
            // though they are less likely to contain the markers.
            // For now, assume they are part of the current phase.
            if (inPreDockerScript) {
              controller.enqueue(`PRE_DOCKER_LOG_RAW: ${rawChunkStr}`);
            } else {
              controller.enqueue(`LOG_RAW: ${rawChunkStr}`);
            }
            // Collect raw chunks based on current phase understanding, or just always to stdoutChunks
            // This part might need refinement if raw chunks are common and need strict separation
            if (inPreDockerScript && chunk[0] === 2) stderrChunks.push(chunk); else stdoutChunks.push(chunk);
          }
        } catch (e) {
          const error = e as Error;
          console.error("Error processing chunk for client stream or server log:", error);
          // Send error with context if possible
          const errorPrefix = inPreDockerScript ? "PRE_DOCKER_ERROR" : "LOG_ERROR";
          controller.enqueue(`${errorPrefix}: Error processing Docker log chunk: ${error.message}`);
        }
      });

      dockerStream!.on('end', async () => {
        try {
          console.log("Docker stream ended. Waiting for container to exit...");
          // container is 'any' here, but it should have a 'wait' method if it's a Dockerode container object
          const waitResponse = await container.wait();
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

          const scriptEndTime = Date.now();
          const scriptExecutionDuration = parseFloat(((scriptEndTime - scriptStartTime) / 1000).toFixed(2));
          const resultPayload = {
            ...finalResult,
            scriptExecutionDuration: scriptExecutionDuration,
          };

          controller.enqueue(`RESULT: ${JSON.stringify(resultPayload)}`);
          controller.close();
        } catch (e) {
          const error = e as Error;
          console.error("Error in stream 'end' processing or finalization:", error);
          const scriptEndTime = Date.now();
          const scriptExecutionDuration = parseFloat(((scriptEndTime - scriptStartTime) / 1000).toFixed(2));
          // Send a final error to the client if possible
          const errorResult: ExecutionResult = {
            overallStatus: 'failure',
            error: `Error during final processing: ${error.message}`,
            preHostRun: preHostRunResult,
            preDockerRun: { stdout: Buffer.concat(stdoutChunks).toString('utf-8'), stderr: Buffer.concat(stderrChunks).toString('utf-8'), status: 'failure', error: `Error during final processing: ${error.message}` },
            mainScript: { stdout: '', stderr: '', status: 'failure', error: `Error during final processing: ${error.message}` },
            scriptExecutionDuration: scriptExecutionDuration, // Include duration in error
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
        const scriptEndTime = Date.now();
        const scriptExecutionDuration = parseFloat(((scriptEndTime - scriptStartTime) / 1000).toFixed(2));
        // Try to send an error message over the stream before closing it with an error.
        const errorResult: ExecutionResult = {
          overallStatus: 'failure',
          error: `Docker stream error: ${err.message}`,
          preHostRun: preHostRunResult,
          preDockerRun: { stdout: Buffer.concat(stdoutChunks).toString('utf-8'), stderr: Buffer.concat(stderrChunks).toString('utf-8'), status: 'failure', error: `Docker stream error: ${err.message}` },
          mainScript: { stdout: '', stderr: '', status: 'not_run' },
          scriptExecutionDuration: scriptExecutionDuration, // Include duration in error
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
}
