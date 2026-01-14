
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { containerId } = body;

        if (!containerId || typeof containerId !== 'string') {
            return NextResponse.json({ error: "Invalid container ID" }, { status: 400 });
        }

        console.log(`Attempting to stop container: ${containerId}`);

        // Force kill and remove the container immediately
        await execPromise(`docker rm -f ${containerId}`);

        console.log(`Container ${containerId} stopped/removed.`);

        return NextResponse.json({ message: "Container stopped successfully" });

    } catch (error) {
        console.error("Error stopping container:", error);
        return NextResponse.json({ error: "Failed to stop container" }, { status: 500 });
    }
}
