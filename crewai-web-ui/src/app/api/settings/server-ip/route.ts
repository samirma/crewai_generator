import { NextResponse } from 'next/server';
import { findSearxngService, getServerConfig, saveServerConfig } from '@/utils/discovery';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    let { ip, port } = getServerConfig();

    if (!ip || force) {
        // If no IP is saved OR force is true, try to discover it
        const result = await findSearxngService();
        if (result) {
            ip = result.ip;
            port = result.port;
            saveServerConfig(ip, port);
        }
    }

    return NextResponse.json({ ip, port });
}

export async function POST(request: Request) {
    try {
        const { ip, port } = await request.json();
        if (ip) {
            saveServerConfig(ip, port || 8080);
            return NextResponse.json({ success: true, ip, port: port || 8080 });
        }
        return NextResponse.json({ success: false, error: 'IP is required' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
}
