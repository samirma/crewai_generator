import { ExecutionResult, StageOutput } from './types';


export async function processDockerStreamAndFinalize(
  containerStdout: string,
  containerStderr: string,
  containerStatusCode: number,
  preHostRunResult: StageOutput,
  initialOverallStatus: 'success' | 'failure',
  initialResultError?: string
): Promise<ExecutionResult> {
  console.log("processDockerStreamAndFinalize received containerStdout:", containerStdout);
  console.log("processDockerStreamAndFinalize received containerStderr:", containerStderr);
  console.log("processDockerStreamAndFinalize received containerStatusCode:", containerStatusCode);

  const result: ExecutionResult = {
    preHostRun: preHostRunResult,
    preDockerRun: { stdout: '', stderr: '', status: 'not_run' },
    mainScript: { stdout: '', stderr: containerStderr, status: 'not_run' },
    overallStatus: initialOverallStatus,
    error: initialResultError,
  };

  if (result.overallStatus === 'failure') {
    if (result.preDockerRun) {
      result.preDockerRun.status = 'skipped';
    }
    if (result.mainScript) {
      result.mainScript.status = 'skipped';
    }
    return result;
  }

  const PRE_DOCKER_START_MARKER = "--- Running pre_docker_run.sh ---";
  const PRE_DOCKER_END_MARKER = "--- pre_docker_run.sh finished with exit code 0 ---";
  const PRE_DOCKER_SKIP_MARKER = "--- /workspace/pre_docker_run.sh not found, skipping. ---";
  const MAIN_SCRIPT_START_MARKER = "--- Running main script ---";
  const MAIN_SCRIPT_END_MARKER = "--- Main script finished with exit code 0 ---";
	const CREW_SUCCESS_MARKER = "Crew Execution successful";
	const CREW_ERROR_MARKER = "Crew Execution failed";

  // Pre-Docker Run Parsing
  const preDockerSkipIdx = containerStdout.indexOf(PRE_DOCKER_SKIP_MARKER);
  const preDockerStartIdx = containerStdout.indexOf(PRE_DOCKER_START_MARKER);
  const preDockerEndIdx = containerStdout.indexOf(PRE_DOCKER_END_MARKER);

  let mainScriptOutputCandidate = containerStdout;

  if (preDockerSkipIdx !== -1) {
    if (result.preDockerRun) {
      result.preDockerRun.status = 'skipped';
    }
    mainScriptOutputCandidate = containerStdout.substring(preDockerSkipIdx + PRE_DOCKER_SKIP_MARKER.length);
  } else if (preDockerStartIdx !== -1) {
    if (preDockerEndIdx !== -1) {
      if (result.preDockerRun) {
        result.preDockerRun.status = 'success';
        result.preDockerRun.stdout = containerStdout.substring(preDockerStartIdx + PRE_DOCKER_START_MARKER.length, preDockerEndIdx).trim();
      }
      mainScriptOutputCandidate = containerStdout.substring(preDockerEndIdx + PRE_DOCKER_END_MARKER.length);
    } else {
      if (result.preDockerRun) {
        result.preDockerRun.status = 'failure';
        result.preDockerRun.error = "pre_docker_run.sh started but did not finish successfully.";
        result.preDockerRun.stdout = containerStdout.substring(preDockerStartIdx + PRE_DOCKER_START_MARKER.length);
      }
      if (result.mainScript) {
        result.mainScript.status = 'skipped';
      }
      mainScriptOutputCandidate = containerStdout.substring(preDockerStartIdx + PRE_DOCKER_START_MARKER.length);
    }
  }

  // Main Script Parsing
  if (result.preDockerRun && result.preDockerRun.status !== 'failure') {
    const mainScriptStartIdx = mainScriptOutputCandidate.indexOf(MAIN_SCRIPT_START_MARKER);
    if (mainScriptStartIdx !== -1) {
      if (result.mainScript) {
        result.mainScript.status = 'running';
        const mainScriptContentStart = mainScriptStartIdx + MAIN_SCRIPT_START_MARKER.length;
        const mainScriptEndIdx = mainScriptOutputCandidate.indexOf(MAIN_SCRIPT_END_MARKER, mainScriptContentStart);
        result.mainScript.stdout = mainScriptOutputCandidate.substring(mainScriptContentStart).trim();

        if (mainScriptEndIdx !== -1) {
          result.mainScript.status = 'success';
        } else if (containerStatusCode !== 0) {
          result.mainScript.status = 'failure';
        }

        if (result.mainScript.stdout.includes(CREW_SUCCESS_MARKER)) {
          result.mainScript.status = 'success';
        }

        if (result.mainScript.stdout.includes(CREW_ERROR_MARKER)) {
          result.mainScript.status = 'failure';
        }
      }
    } else {
      if (result.mainScript) {
        result.mainScript.status = 'failure';
        result.mainScript.error = "Main script start marker not found.";
        result.mainScript.stdout = mainScriptOutputCandidate.trim();
      }
    }
  }

  // Final Status Determination
  if (containerStatusCode === 0) {
    if ((result.preHostRun && result.preHostRun.status === 'failure') ||
        (result.preDockerRun && result.preDockerRun.status === 'failure') ||
        (result.mainScript && result.mainScript.status === 'failure')) {
      result.overallStatus = 'failure';
    } else {
      result.overallStatus = 'success';
    }
  } else {
    result.overallStatus = 'failure';
    if (result.mainScript && result.mainScript.status !== 'failure') {
      result.mainScript.status = 'failure';
      if (!result.mainScript.error) {
        result.mainScript.error = `Script execution failed with container exit code ${containerStatusCode}.`;
      }
    }
  }

  if (result.overallStatus === 'failure' && !result.error) {
    result.error = (result.mainScript && result.mainScript.error) ||
                   (result.preDockerRun && result.preDockerRun.error) ||
                   (result.preHostRun && result.preHostRun.error) ||
                   `Container exited with status code ${containerStatusCode}. Check logs for details.`;
  }
	else if (result.overallStatus === 'success') {
    if (result.mainScript) {
		  result.mainScript.stdout += "\n\n✅ Crew run finished successfully!"
    }
	}

  console.log("Final processed execution result (after parsing):", JSON.stringify(result, null, 2));
  return result;
}
