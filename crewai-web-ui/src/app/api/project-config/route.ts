import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const WORKSPACE_DIR = path.join(process.cwd(), '..', 'workspace');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('project');

    let baseDir = WORKSPACE_DIR;
    if (projectName) {
        baseDir = path.join(process.cwd(), '..', 'projects', projectName);
    }

    const configPath = path.join(baseDir, 'crewai_generated', 'project_config.yaml');

    try {
        const fileContent = await fs.readFile(configPath, 'utf-8');
        const config = yaml.load(fileContent);
        return NextResponse.json(config);
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            // Config might not exist yet, return empty or specific error
            return NextResponse.json({ outputs: [] });
        }
        console.error('Error reading project config:', error);
        return NextResponse.json({ error: 'Failed to read project config' }, { status: 500 });
    }
}
