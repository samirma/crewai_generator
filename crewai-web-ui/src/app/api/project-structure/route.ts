import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const WORKSPACE_DIR = path.join(process.cwd(), '..', 'workspace');
const GENERATED_DIR = path.join(WORKSPACE_DIR, 'crewai_generated');

interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileTreeNode[];
}

async function getFileTree(dir: string, relativePath: string = ''): Promise<FileTreeNode[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name);
      const newRelativePath = path.join(relativePath, dirent.name);
      if (dirent.isDirectory()) {
        return {
          name: dirent.name,
          type: 'folder' as const,
          path: newRelativePath,
          children: await getFileTree(res, newRelativePath),
        };
      } else {
        return {
          name: dirent.name,
          type: 'file' as const,
          path: newRelativePath,
        };
      }
    })
  );
  return files;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  if (file) {
    try {
      const filePath = path.join(GENERATED_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      return new Response(content, { headers: { 'Content-Type': 'text/plain' } });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return new Response('File not found', { status: 404 });
      }
      console.error(`Error reading file ${file}:`, error);
      return new Response('Failed to read file', { status: 500 });
    }
  }

  try {
    const fileTree = await getFileTree(GENERATED_DIR);
    return NextResponse.json(fileTree);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('Error reading project structure:', error);
    return NextResponse.json({ error: 'Failed to read project structure' }, { status: 500 });
  }
}