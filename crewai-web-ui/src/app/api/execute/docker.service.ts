import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { ExecutePythonScriptSetupResult, StageOutput } from './types';

// Helper function to execute Python script in Docker
export async function executePythonScript(controller?: ReadableStreamDefaultController, projectName?: string, scriptName?: string): Promise<ExecutePythonScriptSetupResult> { // Changed return type
  const docker = new Docker(); // Assumes Docker is accessible (e.g., /var/run/docker.sock)
  const projectRoot = path.resolve(process.cwd(), '..');

  // Determine workspace directory based on projectName
  let workspaceDir = path.join(projectRoot, 'workspace');
  if (projectName) {
    workspaceDir = path.join(projectRoot, 'projects', projectName);
  }

  // Initialize preHostRunResult for the return value
  const preHostRunResult: StageOutput = { stdout: '', stderr: '', status: 'not_run' };
  let overallStatus: 'success' | 'failure' = 'success';
  let topLevelError: string | undefined = undefined;

  try {

    // --- Execute pre_host_run.sh if it exists ---
    const preHostRunScriptPath = path.join(workspaceDir, 'pre_host_run.sh');
    preHostRunResult.status = 'running';
    try {
      await fs.access(preHostRunScriptPath, fs.constants.F_OK);
      console.log(`Executing host pre-run script: ${preHostRunScriptPath}`);
      const execResult = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
        exec(`sh ${preHostRunScriptPath}`, { cwd: workspaceDir }, (error, stdout, stderr) => {
          if (error) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            error.stdout = stdout;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
    } catch (error) {
      const execError = error as (Error & { code?: string | number; stdout?: string; stderr?: string; });
      if (execError.code === 'ENOENT') {
        preHostRunResult.status = 'skipped';
        console.log(`Host pre-run script (${preHostRunScriptPath}) not found. Skipping.`);
      } else {
        console.error(`Failed to execute pre_host_run.sh:`, error);
        preHostRunResult.status = 'failure';
        preHostRunResult.error = execError.message || 'Unknown error';
        preHostRunResult.stdout = execError.stdout || '';
        preHostRunResult.stderr = execError.stderr || '';
        preHostRunResult.exitCode = typeof execError.code === 'string' ? parseInt(execError.code, 10) : execError.code || 1;
        overallStatus = 'failure';
        topLevelError = `Pre-host run script failed: ${execError.message}`;
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
          if (controller) {
            const dataStr = data.toString('utf-8');
            controller.enqueue(`LOG: ${dataStr}`);
          }
        });

        child.stderr?.on('data', (data) => {
          process.stderr.write(data); // Stream stderr directly
          if (controller) {
            const dataStr = data.toString('utf-8');
            controller.enqueue(`LOG: ${dataStr}`);
          }
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
    } catch (buildError) {
      const error = buildError as Error;
      console.error(`Critical failure to build ${imageName} image:`, error);
      overallStatus = 'failure';
      topLevelError = `Docker image build failed: ${error.message}`;
      // Early exit for Docker build failure
      return { preHostRunResult, overallStatus, error: topLevelError, dockerCommand: "" }; // Return empty dockerCommand on failure
    }

    // --- Docker Container Setup ---
    const scriptToRun = scriptName || 'run_crew.sh';
    const dockerCommand = `/bin/sh /workspace/${scriptToRun}`;
    try {
      const container = await docker.createContainer({
        Image: imageName,
        Cmd: ['/bin/sh', '-c', dockerCommand],
        WorkingDir: '/workspace/crewai_generated',
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
      console.log(`Container for ${imageName} started. ID: ${container.id}`);

      // Construct a representation of the docker run command for display purposes
      const fullDockerCommand = `docker run --rm --network host -v "${workspaceDir}:/workspace" ${imageName} ${dockerCommand}`;

      return { container, stream, preHostRunResult, overallStatus, dockerCommand: fullDockerCommand, containerId: container.id }; // Return full command and ID

    } catch (dockerErr) {
      const error = dockerErr as Error;
      console.error("Error setting up or starting Docker container:", error);
      overallStatus = 'failure';
      topLevelError = `Docker container setup/start error: ${error.message}`;
      // Try to get ID if container was created but failed to start/attach?? 
      // types declare containerId as optional, so it's fine if undefined.
      return { preHostRunResult, overallStatus, error: topLevelError, dockerCommand }; // Return dockerCommand even on error
    }

  } catch (topLevelCatchError) { // Catch errors from fs operations, etc.
    const error = topLevelCatchError as Error;
    console.error("Top-level error in executePythonScript setup:", error);
    overallStatus = 'failure';
    topLevelError = `Unhandled setup error: ${error.message}`;
    // In this case, dockerCommand might not have been defined, so ensure it's part of the return if needed or set to empty
    return { preHostRunResult, overallStatus, error: topLevelError, dockerCommand: "" };
  }
}
