export interface StageOutput {
  stdout: string;
  stderr: string;
  status: 'success' | 'failure' | 'skipped' | 'not_run' | 'running';
  exitCode?: number;
  error?: string; // For errors in launching the stage, not script's own stderr
}

export interface ExecutionResult {
  preHostRun?: StageOutput;
  preDockerRun?: StageOutput;
  mainScript?: StageOutput;
  overallStatus: 'success' | 'failure';
  error?: string; // For top-level errors like Docker build failure or unhandled exceptions
  scriptExecutionDuration?: number; // Added this line
}

// Interface for the return type of the modified executePythonScript
export interface ExecutePythonScriptSetupResult {
  container?: any; // Using 'any' for Docker.Container to avoid Docker import in types file
  stream?: NodeJS.ReadableStream; // Optional because attach might fail or not be reached
  preHostRunResult: StageOutput;
  overallStatus: 'success' | 'failure';
  error?: string;
  dockerCommand?: string;
}
