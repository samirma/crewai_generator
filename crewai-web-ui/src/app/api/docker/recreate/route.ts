import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST() {
  try {
    // First, remove the existing image
    await execAsync('docker rmi python-runner');
    // Then, rebuild the image
    await execAsync('docker build -t python-runner ./python-runner');
    return NextResponse.json({ message: 'Docker image recreated successfully' });
  } catch (error) {
    console.error('Error recreating Docker image:', error);
    return NextResponse.json({ error: 'Failed to recreate Docker image' }, { status: 500 });
  }
}
