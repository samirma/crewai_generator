import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

import { ExecutePythonScriptSetupResult, StageOutput } from './types';

// Helper function to execute Python script in Docker
export async function executePythonScript(scriptContent: string): Promise<ExecutePythonScriptSetupResult> { // Changed return type
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
        const command = 'docker';
        const args = ['build', '-t', imageName, './python-runner'];
        const options = { cwd: projectRoot, stdio: 'pipe' as const }; // stdio: 'pipe' is important for capturing output

        const child = exec(command + ' ' + args.join(' '), options);

        child.stdout?.on('data', (data) => {
          process.stdout.write(data); // Stream stdout directly
        });

        child.stderr?.on('data', (data) => {
          process.stderr.write(data); // Stream stderr directly
        });

        child.on('close', (code) => {
          if (code !== 0) {
            console.error(`Docker build process exited with code ${code}`);
            return reject(new Error(`Failed to build ${imageName}: process exited with code ${code}`));
          }
          console.log(`${imageName} image build completed successfully.`);
          resolve();
        });

        child.on('error', (err) => {
          console.error(`Error executing docker build:`, err);
          reject(err);
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
          NetworkMode: "host",
        },
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
