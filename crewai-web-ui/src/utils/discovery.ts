import Bonjour from 'bonjour-service';

interface DiscoveredServer {
  name: string;
  ip: string;
  port: number;
  user?: string;
  type: string;
}

/**
 * Discover SSH services published via Avahi/Bonjour on the local network.
 * This looks for services published by the publish_ssh.sh script on other computers.
 */
export async function discoverServers(timeout = 5000): Promise<DiscoveredServer[]> {
  return new Promise((resolve) => {
    const bonjour = new Bonjour();
    const servers: DiscoveredServer[] = [];
    let timer: NodeJS.Timeout;

    console.log('🔍 Searching for published servers on network...');

    // Search for SSH services (_ssh._tcp)
    const browser = bonjour.find({ type: 'ssh' }, (service) => {
      console.log('Found service:', service.name, service.addresses, service.port);
      
      if (service.addresses && service.addresses.length > 0) {
        // Filter for IPv4 addresses
        const ipv4 = service.addresses.find(addr => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr));
        
        if (ipv4) {
          // Extract user from txt records if available
          const txt = service.txt || {};
          const user = txt.user || undefined;
          
          servers.push({
            name: service.name,
            ip: ipv4,
            port: service.port,
            user,
            type: 'ssh',
          });
        }
      }
    });

    // Set timeout to stop searching
    timer = setTimeout(() => {
      console.log(`Discovery complete. Found ${servers.length} server(s).`);
      bonjour.destroy();
      resolve(servers);
    }, timeout);

    // Handle browser stop
    browser.on('down', () => {
      // Service went down, will be handled by timeout
    });
  });
}

/**
 * Get the first discovered server (for backward compatibility)
 */
export async function findServer(timeout = 5000): Promise<DiscoveredServer | null> {
  const servers = await discoverServers(timeout);
  return servers.length > 0 ? servers[0] : null;
}
