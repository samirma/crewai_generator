import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

// Path to the docker-compose file (relative to project root)
const DOCKER_COMPOSE_PATH = path.resolve(process.cwd(), '../docker-compose.mcp.yml');

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  health?: 'healthy' | 'unhealthy' | 'starting' | 'unknown';
  port?: number;
  available?: boolean;
}

const SERVICES = [
  { name: 'searxng', containerName: 'mcp-searxng', port: 8080, healthPath: '/healthz' },
  { name: 'crawl4ai', containerName: 'mcp-crawl4ai', port: 11235, healthPath: '/health' },
  { name: 'kimi-server', containerName: 'mcp-kimi-server', port: 3050, healthPath: null },
];

async function checkServiceAvailability(port: number, path: string | null): Promise<{ available: boolean; statusCode?: number }> {
  try {
    // Use curl to check if service is responding
    const url = path ? `http://localhost:${port}${path}` : `http://localhost:${port}`;
    const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" --max-time 3 ${url}`);
    const statusCode = parseInt(stdout.trim(), 10);
    // Accept 200-499 as "available" (service is responding, even if auth required)
    return { available: statusCode >= 200 && statusCode < 500, statusCode };
  } catch {
    return { available: false };
  }
}

async function getDockerStatus(containerName: string): Promise<{ state: string; health: string } | null> {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter "name=${containerName}" --format "{{.State}}"`
    );
    if (stdout.trim()) {
      return { state: stdout.trim(), health: 'unknown' };
    }

    // Check if container exists but is stopped
    const { stdout: stoppedStdout } = await execAsync(
      `docker ps -a --filter "name=${containerName}" --format "{{.State}}"`
    );
    if (stoppedStdout.trim()) {
      return { state: 'stopped', health: 'unknown' };
    }

    return null;
  } catch {
    return null;
  }
}

async function getServiceStatus(): Promise<ServiceStatus[]> {
  const statuses: ServiceStatus[] = [];

  for (const service of SERVICES) {
    // First check HTTP availability (most reliable)
    const httpCheck = await checkServiceAvailability(service.port, service.healthPath);

    // Try to get Docker status (may fail if no Docker access)
    const dockerStatus = await getDockerStatus(service.containerName);

    if (httpCheck.available) {
      // Service is responding via HTTP - consider it running
      statuses.push({
        name: service.name,
        status: 'running',
        health: httpCheck.statusCode === 200 ? 'healthy' : 'unknown',
        port: service.port,
        available: true,
      });
    } else if (dockerStatus) {
      // HTTP not available but we have Docker info
      if (dockerStatus.state === 'running') {
        statuses.push({
          name: service.name,
          status: 'running',
          health: 'starting', // Running but not responding yet
          port: service.port,
          available: false,
        });
      } else if (dockerStatus.state === 'stopped') {
        statuses.push({
          name: service.name,
          status: 'stopped',
          port: service.port,
          available: false,
        });
      } else {
        statuses.push({
          name: service.name,
          status: 'error',
          port: service.port,
          available: false,
        });
      }
    } else {
      // No HTTP response and no Docker info
      statuses.push({
        name: service.name,
        status: 'unknown',
        port: service.port,
        available: false,
      });
    }
  }

  return statuses;
}

// GET /api/mcp-services - Get status of all MCP services
export async function GET() {
  try {
    const statuses = await getServiceStatus();
    return NextResponse.json({ services: statuses });
  } catch (error) {
    console.error('Error getting MCP service status:', error);
    return NextResponse.json(
      { error: 'Failed to get service status' },
      { status: 500 }
    );
  }
}

// POST /api/mcp-services - Start/stop services
export async function POST(request: Request) {
  try {
    const { action, service } = await request.json();

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use start, stop, or restart' },
        { status: 400 }
      );
    }

    let command: string;

    if (service) {
      // Action on specific service
      const targetService = SERVICES.find(s => s.name === service);
      if (!targetService) {
        return NextResponse.json(
          { error: `Unknown service: ${service}` },
          { status: 400 }
        );
      }

      switch (action) {
        case 'start':
          command = `docker compose -f "${DOCKER_COMPOSE_PATH}" up -d ${service}`;
          break;
        case 'stop':
          command = `docker compose -f "${DOCKER_COMPOSE_PATH}" stop ${service}`;
          break;
        case 'restart':
          command = `docker compose -f "${DOCKER_COMPOSE_PATH}" restart ${service}`;
          break;
        default:
          throw new Error(`Unexpected action: ${action}`);
      }
    } else {
      // Action on all services
      switch (action) {
        case 'start':
          command = `docker compose -f "${DOCKER_COMPOSE_PATH}" up -d`;
          break;
        case 'stop':
          command = `docker compose -f "${DOCKER_COMPOSE_PATH}" stop`;
          break;
        case 'restart':
          command = `docker compose -f "${DOCKER_COMPOSE_PATH}" restart`;
          break;
        default:
          throw new Error(`Unexpected action: ${action}`);
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Container')) {
        console.warn('Docker compose warning:', stderr);
      }
    } catch (dockerError) {
      console.error('Docker command failed:', dockerError);
      // Continue to get status even if Docker command failed
    }

    // Wait a moment for the action to take effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get updated status
    const statuses = await getServiceStatus();

    return NextResponse.json({
      success: true,
      action,
      service: service || 'all',
      services: statuses,
    });
  } catch (error) {
    console.error('Error managing MCP services:', error);
    return NextResponse.json(
      { error: 'Failed to manage services', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
