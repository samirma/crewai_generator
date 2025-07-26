import { NextResponse } from 'next/server';
import { ensureDockerImage } from '../../execute/docker.service';

export async function POST() {
  try {
    await ensureDockerImage(true); // forceRebuild = true
    return NextResponse.json({ message: 'Docker image recreated successfully' });
  } catch (error) {
    console.error('Error recreating Docker image:', error);
    return NextResponse.json({ error: 'Failed to recreate Docker image' }, { status: 500 });
  }
}
