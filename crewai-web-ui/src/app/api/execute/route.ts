import { NextResponse } from 'next/server';
import { executePythonScript } from './docker.service';
import { streamDockerLogsToController } from './stream.service';
import { ExecutionResult } from './types';

export async function POST(req: Request) {
  const scriptStartTime = Date.now(); // Record start time before execution setup

  let projectName: string | undefined;
  try {
    // Clone the request to read the body, as it might be consumed by Next.js or other middleware if we are not careful.
    // However, req.json() consumes the body. 
    // The issue is that we are returning a stream, and we can't easily read the body AND stream response in standard Next.js App Router 
    // if we were just proxying, but here we are initiating logic.
    // BUT, checking the existing code, it didn't read the body at all! 
    // It just started execution assuming default workspace. 
    // To support passing projectName, we MUST read the body.
    const body = await req.json();
    projectName = body.projectName;
  } catch (e) {
    // If parsing fails (e.g. empty body), just proceed with default (undefined projectName)
    // console.warn("Could not parse request body for projectName:", e);
  }

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`Received script for execution. Project: ${projectName || 'default (workspace)'}. Setting up Docker container and stream...`);
        // Pass controller to executePythonScript to stream build logs
        const setupResult = await executePythonScript(controller, projectName);

        // If setup failed (e.g., pre-host, docker build, container creation failed)
        if (setupResult.overallStatus === 'failure' || !setupResult.container || !setupResult.stream) {
          console.error("Failed to setup Docker execution:", setupResult.error);
          const scriptEndTime = Date.now();
          const scriptExecutionDuration = parseFloat(((scriptEndTime - scriptStartTime) / 1000).toFixed(2));
          const finalErrorResult: ExecutionResult = {
            preHostRun: setupResult.preHostRunResult,
            // preDockerRun and mainScript might not have been attempted, initialize them
            preDockerRun: { stdout: '', stderr: '', status: 'not_run', error: setupResult.error ? "Skipped due to setup failure" : undefined },
            mainScript: { stdout: '', stderr: '', status: 'not_run', error: setupResult.error ? "Skipped due to setup failure" : undefined },
            overallStatus: 'failure',
            error: setupResult.error || "Unknown error during setup phase.",
            scriptExecutionDuration: scriptExecutionDuration, // Add duration to error responses too
          };

          controller.enqueue(`RESULT: ${JSON.stringify(finalErrorResult)}`);
          controller.close();
          return;
        }

        console.log("Docker setup successful. Starting to stream logs and process final result...");

        const {
          container,
          stream: dockerStream,
          preHostRunResult,
          overallStatus: setupOverallStatus,
          error: setupError,
          dockerCommand: retrievedDockerCommand,
          containerId
        } = setupResult;

        if (containerId) {
          controller.enqueue(`CONTAINER_ID: ${containerId}\n`);
        }

        // dockerStream is asserted non-null by the check above
        // container is also asserted non-null by the check above
        streamDockerLogsToController(
          controller,
          dockerStream!,
          container!,
          preHostRunResult,
          setupOverallStatus,
          setupError,
          retrievedDockerCommand,
          scriptStartTime // Pass scriptStartTime to handleDockerStream
        );

      } catch (error) {
        const err = error as Error;
        // This catches errors in the POST handler's initial setup,
        // or if executePythonScript itself throws before returning (should be caught internally by it)
        console.error("Critical Error in /api/execute POST handler:", err);
        const errorResult: ExecutionResult = {
          overallStatus: 'failure',
          error: err.message || "An unknown error occurred in the API endpoint."
        };
        try {
          controller.enqueue(`RESULT: ${JSON.stringify(errorResult)}`);
        } catch (enqueueError) {
          console.error("Failed to enqueue critical error:", enqueueError);
        }
        controller.close();
      }
    }
  });

  return new NextResponse(readableStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff', // Important for security with text/plain
      // 'Transfer-Encoding': 'chunked', // Next.js handles this automatically for ReadableStream responses
    }
  });
}
