import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST() {
  try {
    const { stdout } = await execAsync('docker ps -q --filter "ancestor=python-runner"');
    const containerId = stdout.trim();
    if (containerId) {
      await execAsync(`docker stop ${containerId}`);
      return NextResponse.json({ message: 'Script interrupted successfully' });
    } else {
      return NextResponse.json({ error: 'No running script found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error interrupting script:', error);
    return NextResponse.json({ error: 'Failed to interrupt script' }, { status: 500 });
  }
}
