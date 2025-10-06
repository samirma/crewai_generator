import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const workspaceDir = path.join(process.cwd(), 'workspace');
const agentCodeDir = path.join(workspaceDir, 'agent_code');

export async function POST(request: Request) {
  try {
    console.log("--- SCAFFOLDING NEW PROJECT ---");
    // Ensure the workspace directory exists
    await fs.mkdir(workspaceDir, { recursive: true });

    // Clean any previous project directory
    await fs.rm(agentCodeDir, { recursive: true, force: true });
    console.log(`Removed existing directory: ${agentCodeDir}`);

    // Run the crewai create command
    console.log(`Executing 'crewai create crew agent_code' in ${workspaceDir}`);
    const { stdout, stderr } = await execAsync('crewai create crew agent_code', { cwd: workspaceDir });

    if (stderr) {
      console.warn("Scaffolding command finished with warnings:", stderr);
    }
    console.log("Scaffolding command successful:", stdout);

    return NextResponse.json({ success: true, message: "Project scaffolded successfully.", stdout, stderr });
  } catch (error: any) {
    console.error("Error scaffolding project:", error);
    // The execAsync promise rejects with an object that includes stdout and stderr
    const errorMessage = error.stderr || error.stdout || error.message;
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}