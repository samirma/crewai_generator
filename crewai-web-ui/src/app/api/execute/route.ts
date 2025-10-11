import { NextResponse } from 'next/server';
import { executePythonScript } from './docker.service';
import { handleDockerStream } from './stream.service';
import { ExecutionResult } from './types';

export async function POST() {
  try {
    console.log("Received script for execution. Setting up Docker container and stream...");
    const scriptStartTime = Date.now(); // Record start time before execution setup
    const setupResult = await executePythonScript();

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
      return NextResponse.json(finalErrorResult, { status: 500 });
    }

    console.log("Docker setup successful. Starting to stream logs and process final result...");

    const {
      container,
      stream: dockerStream,
      preHostRunResult,
      overallStatus: setupOverallStatus,
      error: setupError,
      dockerCommand: retrievedDockerCommand
    } = setupResult;

    // dockerStream is asserted non-null by the check above
    // container is also asserted non-null by the check above
    const readableStream = handleDockerStream(
      dockerStream!,
      container!,
      preHostRunResult,
      setupOverallStatus,
      setupError,
      retrievedDockerCommand,
      scriptStartTime // Pass scriptStartTime to handleDockerStream
    );

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff', // Important for security with text/plain
        // 'Transfer-Encoding': 'chunked', // Next.js handles this automatically for ReadableStream responses
      }
    });

  } catch (error) {
    const err = error as Error;
    // This catches errors in the POST handler's initial setup,
    // or if executePythonScript itself throws before returning (should be caught internally by it)
    console.error("Critical Error in /api/execute POST handler:", err);
    const errorResult: ExecutionResult = {
      overallStatus: 'failure',
      error: err.message || "An unknown error occurred in the API endpoint."
    };
    return NextResponse.json(errorResult, { status: 500 });
  }
}
