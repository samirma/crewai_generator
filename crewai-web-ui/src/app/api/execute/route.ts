import { NextResponse } from 'next/server';
import { executePythonScript } from './docker.service';
import { handleDockerStream } from './stream.service';
import { StageOutput, ExecutionResult, ExecutePythonScriptSetupResult } from './types';

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
      retrievedDockerCommand
    );

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
