
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import toml from '@iarna/toml';

export async function GET() {
  const projectsDir = path.resolve(process.cwd(), '..', 'projects');

  try {
    // Ensure projects directory exists
    try {
      await fs.access(projectsDir);
    } catch {
      await fs.mkdir(projectsDir);
    }

    const files = await fs.readdir(projectsDir, { withFileTypes: true });
    // Filter for directories only
    const projects = await Promise.all(files
      .filter(dirent => dirent.isDirectory())
      .map(async (dirent) => {
        const projectPath = path.join(projectsDir, dirent.name);

        // Try to read description from pyproject.toml
        let description = '';
        try {
          // Check potential locations for pyproject.toml
          const possiblePaths = [
            path.join(projectPath, 'pyproject.toml'),
            path.join(projectPath, 'crewai_generated', 'pyproject.toml')
          ];

          for (const p of possiblePaths) {
            try {
              const content = await fs.readFile(p, 'utf-8');
              const parsed = toml.parse(content) as any;

              // Check standard pyproject.toml location: [project] description
              if (parsed.project && parsed.project.description) {
                description = parsed.project.description;
                break;
              }
              // Fallback check for [tool.poetry] description if needed
              if (parsed.tool && parsed.tool.poetry && parsed.tool.poetry.description) {
                description = parsed.tool.poetry.description;
                break;
              }
            } catch (e) {
              // File doesn't exist or can't be read/parsed, continue to next possibility
              continue;
            }
          }
        } catch (e) {
          console.error(`Error reading description for ${dirent.name}:`, e);
        }

        return {
          name: dirent.name,
          path: projectPath,
          description
        };
      }));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error listing projects:", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
    }

    // Basic sanitization (prevent traversing up directories)
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
    }

    const projectsDir = path.resolve(process.cwd(), '..', 'projects');
    const projectPath = path.join(projectsDir, name);

    // Verify it exists before deleting
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log(`Deleting project: ${name} at ${projectPath}`);
    await fs.rm(projectPath, { recursive: true, force: true });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
