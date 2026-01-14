
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
        }

        // Basic sanitization
        const sanitizedUniqueName = name.replace(/[^a-zA-Z0-9_-]/g, '_');

        if (sanitizedUniqueName !== name) {
            return NextResponse.json({ error: "Invalid characters in project name. Use only alphanumeric, underscore, and dash." }, { status: 400 });
        }

        const projectRoot = path.resolve(process.cwd(), '..');
        const workspaceDir = path.join(projectRoot, 'workspace');
        const targetDir = path.join(projectRoot, 'projects', sanitizedUniqueName);

        // Check if target directory already exists
        try {
            await fs.access(targetDir);
            return NextResponse.json({ error: "Project with this name already exists" }, { status: 409 });
        } catch {
            // Directory doesn't exist, proceed
        }

        // Copy function
        async function copyDir(src: string, dest: string) {
            await fs.mkdir(dest, { recursive: true });
            const entries = await fs.readdir(src, { withFileTypes: true });

            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);

                if (entry.isDirectory()) {
                    if (entry.isDirectory()) {
                        // Skip .venv and __pycache__ and .git
                        if (entry.name === '.venv' || entry.name === '__pycache__' || entry.name === '.git') {
                            continue;
                        }

                        // Specific check for nested .venv if we are in crewai_generated (though the recursive check above handles it if name is unique)
                        // The recursion handles it by name check on each level.

                        await copyDir(srcPath, destPath);
                    } else {
                        // Skip .env files if we want to be safe, but requirements didn't specify. 
                        // Usually we want to copy the project as is, minus build artifacts.
                        // The user ONLY asked for .venv removal.
                        await fs.copyFile(srcPath, destPath);
                    }
                } else {
                    await fs.copyFile(srcPath, destPath);
                }
            }
        }

        await copyDir(workspaceDir, targetDir);

        return NextResponse.json({ message: "Project saved successfully", name: sanitizedUniqueName });

    } catch (error) {
        console.error("Error saving project:", error);
        return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
    }
}
