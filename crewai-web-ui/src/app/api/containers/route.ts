import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

interface ContainerInfo {
  id: string;
  names: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

export async function GET() {
  try {
    const { stdout } = await execPromise(
      'docker ps -a --filter "ancestor=python-runner" --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}|{{.CreatedAt}}"'
    );

    const containers: ContainerInfo[] = stdout
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [id, names, image, status, state, ports, created] = line.split('|');
        return {
          id: id.substring(0, 12),
          names: names || 'N/A',
          image: image || 'N/A',
          status: status || 'N/A',
          state: state || 'N/A',
          ports: ports || 'None',
          created: created || 'N/A',
        };
      });

    return NextResponse.json({ containers });
  } catch (error) {
    console.error('Error listing containers:', error);
    return NextResponse.json(
      { error: 'Failed to list containers' },
      { status: 500 }
    );
  }
}
