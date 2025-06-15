import { ExecutionResult, StageOutput } from './types';

export async function processDockerStreamAndFinalize(
  containerStdout: string, // Changed from stream
  containerStderr: string, // Changed from stream
  containerStatusCode: number, // Added
  preHostRunResult: StageOutput,
  initialOverallStatus: 'success' | 'failure', // This reflects status *before* docker execution
  initialResultError?: string     // Error from pre-docker stages
): Promise<ExecutionResult> {
  console.log("processDockerStreamAndFinalize received containerStdout:", containerStdout);
  console.log("processDockerStreamAndFinalize received containerStderr:", containerStderr);
  console.log("processDockerStreamAndFinalize received containerStatusCode:", containerStatusCode);

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

  console.log("mainScriptOutputCandidate before parsing:", mainScriptOutputCandidate);
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
          // DO NOT set result.overallStatus = 'failure' here anymore.
          // It will be determined by containerStatusCode and final checks.
      } else {
          // preDockerRun might be 'not_run', or 'running' (implying it consumed everything or failed early).
          // In this case, mainScript is effectively 'not_run'.
          result.mainScript.status = 'not_run';
      }
    }
  }

  console.log("After main script parsing - result.mainScript.status:", result.mainScript?.status, "result.mainScript.error:", result.mainScript?.error, "result.overallStatus:", result.overallStatus);
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
      } else if (result.mainScript.status === 'failure' &&
                 result.mainScript.error === "Main script start marker not found." &&
                 (result.preDockerRun.status === 'success' || result.preDockerRun.status === 'skipped')) {
        // Main script "failed" due to missing START marker, but container itself succeeded.
        // The overallStatus is 'success' (because containerStatusCode === 0 and no prior stage failed it).
        // mainScript.status remains 'failure' to indicate the marker issue.
        result.mainScript.exitCode = 0;
        if (!result.mainScript.stdout && mainScriptOutputCandidate.trim()) { // Capture stdout if it was missed
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
  if (result.preHostRun?.status === 'failure' || result.preDockerRun?.status === 'failure') {
    result.overallStatus = 'failure';
  } else if (result.mainScript?.status === 'failure') {
    // If mainScript failed, only set overallStatus to failure if it's not the specific "missing start marker with container success" case.
    // The mainScript.exitCode would be 0 in the "acceptable" failure case.
    if (!(result.mainScript.error === "Main script start marker not found." && result.mainScript.exitCode === 0)) {
      result.overallStatus = 'failure';
    }
    // If it was the acceptable failure (missing start marker but container succeeded),
    // and overallStatus was 'success' (due to containerStatusCode === 0 and no prior stage failure),
    // it will remain 'success'.
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
  console.log("Final processed execution result (after parsing):", JSON.stringify(result, null, 2));
  return result;
}
