import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execAsync = util.promisify(exec);

export async function POST() {
  try {
    // Stop any running containers using the python-runner image
    const { stdout: runningContainers } = await execAsync('docker ps -q --filter "ancestor=python-runner"');
    if (runningContainers) {
      await execAsync(`docker stop ${runningContainers.trim()}`);
    }

    // Remove the existing image
    await execAsync('docker rmi -f python-runner');
    // Then, rebuild the image
    const pythonRunnerPath = path.resolve(process.cwd(), 'python-runner');
    await execAsync(`docker build -t python-runner ${pythonRunnerPath}`);
    return NextResponse.json({ message: 'Docker image recreated successfully' });
  } catch (error) {
    console.error('Error recreating Docker image:', error);
    return NextResponse.json({ error: 'Failed to recreate Docker image' }, { status: 500 });
  }
}
