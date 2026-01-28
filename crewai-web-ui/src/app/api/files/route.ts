import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const WORKSPACE_DIR = path.join(process.cwd(), '..', 'workspace');

const getMimeType = (ext: string) => {
    const map: Record<string, string> = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.yaml': 'text/yaml',
        '.yml': 'text/yaml',
    };
    return map[ext.toLowerCase()] || 'text/plain';
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    const projectName = searchParams.get('project');

    if (!file) {
        return new Response('File parameter is required', { status: 400 });
    }

    let baseDir = WORKSPACE_DIR;
    if (projectName) {
        baseDir = path.join(process.cwd(), '..', 'projects', projectName);
    }

    // Handle paths that might start with /workspace/ which is the docker internal path
    // We map /workspace/ to the baseDir
    let relativePath = file;
    if (relativePath.startsWith('/workspace/')) {
        relativePath = relativePath.replace('/workspace/', '');
    }
    // Remove leading slash if present after replacement to ensure it's treated as relative
    if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1);
    }

    const filePath = path.resolve(baseDir, relativePath);

    // Security check: ensure the resolved path is within the baseDir
    if (!filePath.startsWith(baseDir)) {
        return new Response('Access denied', { status: 403 });
    }

    try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
            return new Response('Not a file', { status: 400 });
        }

        const content = await fs.readFile(filePath);
        const mimeType = getMimeType(path.extname(filePath));

        return new Response(content as unknown as BodyInit, {
            headers: {
                'Content-Type': mimeType,
            },
        });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return new Response('File not found', { status: 404 });
        }
        console.error(`Error reading file ${file}:`, error);
        return new Response('Failed to read file', { status: 500 });
    }
}
