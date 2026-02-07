import { NextResponse } from 'next/server';
import { discoverServers } from '@/utils/discovery';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  // If force=true, discover servers on network
  let discovered: { servers: { name: string; ip: string; port: number; user?: string }[] } | null = null;
  
  if (force) {
    const servers = await discoverServers();
    if (servers.length > 0) {
      discovered = {
        servers: servers.map(s => ({ name: s.name, ip: s.ip, port: s.port, user: s.user }))
      };
    }
  }

  return NextResponse.json({ 
    discovered,
  });
}
