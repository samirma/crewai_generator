import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const promptsFilePath = path.join(process.cwd(), 'public', 'prompts.json');

export async function GET() {
  try {
    const prompts = await fs.readFile(promptsFilePath, 'utf-8');
    return NextResponse.json(JSON.parse(prompts));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: 'Failed to read prompts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, prompt } = await request.json();
    const prompts = JSON.parse(await fs.readFile(promptsFilePath, 'utf-8'));
    prompts.push({ title, prompt });
    await fs.writeFile(promptsFilePath, JSON.stringify(prompts, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
  }
}
