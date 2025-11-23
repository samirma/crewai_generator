import fs from 'fs';
import path from 'path';
import Bonjour from 'bonjour-service';

const SERVER_CONFIG_FILE_PATH = path.resolve(process.cwd(), '../workspace/mcp/server_config.ini');

export async function findSearxngService(timeout = 5000): Promise<{ ip: string; port: number } | null> {
    return new Promise((resolve) => {
        const bonjour = new Bonjour();
        let found = false;

        console.log('🔍 Searching for _searxng._tcp.local. services...');

        const browser = bonjour.find({ type: 'searxng' }, (service) => {
            if (found) return;
            if (service.addresses && service.addresses.length > 0) {
                // Filter for IPv4 addresses (simple check for now, or use regex)
                const ipv4 = service.addresses.find(addr => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr));

                if (ipv4) {
                    found = true;
                    const port = service.port;
                    console.log(`-> Found service: ${service.name} at ${ipv4}:${port}`);
                    bonjour.destroy();
                    resolve({ ip: ipv4, port });
                }
            }
        });

        setTimeout(() => {
            if (!found) {
                console.log('Discovery timed out.');
                bonjour.destroy();
                resolve(null);
            }
        }, timeout);
    });
}

export function getServerConfig(): { ip: string | null; port: number | null } {
    try {
        if (fs.existsSync(SERVER_CONFIG_FILE_PATH)) {
            const content = fs.readFileSync(SERVER_CONFIG_FILE_PATH, 'utf-8');
            const ipMatch = content.match(/^server_ip\s*=\s*(.+)$/m);
            const portMatch = content.match(/^searxng_port\s*=\s*(.+)$/m);

            return {
                ip: ipMatch && ipMatch[1] ? ipMatch[1].trim() : null,
                port: portMatch && portMatch[1] ? parseInt(portMatch[1].trim(), 10) : null,
            };
        }
    } catch (error) {
        console.error('Error reading server config file:', error);
    }
    return { ip: null, port: null };
}

export function saveServerConfig(ip: string, port: number = 8080): void {
    try {
        const dir = path.dirname(SERVER_CONFIG_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const content = `[DEFAULT]\nserver_ip = ${ip}\nsearxng_port = ${port}\n`;
        fs.writeFileSync(SERVER_CONFIG_FILE_PATH, content, 'utf-8');
        console.log(`Saved server config to ${SERVER_CONFIG_FILE_PATH}: IP=${ip}, Port=${port}`);
    } catch (error) {
        console.error('Error writing server config file:', error);
    }
}
