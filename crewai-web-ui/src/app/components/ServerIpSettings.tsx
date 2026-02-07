import React, { useState, useEffect } from 'react';

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  health?: 'healthy' | 'unhealthy' | 'starting' | 'unknown';
  port?: number;
  available?: boolean;
}

interface DiscoveredServer {
  name: string;
  ip: string;
  port: number;
  user?: string;
}

const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  'searxng': 'SearxNG Search',
  'crawl4ai': 'Crawl4AI Crawler',
  'kimi-server': 'Kimi API Server',
};

const SERVICE_ICONS: Record<string, string> = {
  'searxng': '🔍',
  'crawl4ai': '🕷️',
  'kimi-server': '🤖',
};

export default function ServerIpSettings() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/mcp-services');
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('Error fetching service status:', err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();
    
    // Auto-refresh every 10 seconds (only service status)
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    setMessage('');
    setError('');
    
    try {
      const res = await fetch('/api/settings/server-ip?force=true');
      const data = await res.json();
      
      const servers = data.discovered?.servers || [];
      setDiscoveredServers(servers);
      
      if (servers.length > 0) {
        setMessage(`Found ${servers.length} server(s) on network`);
      } else {
        setMessage('No servers found on network.');
      }
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError('Discovery failed');
      setTimeout(() => setError(''), 3000);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart', service?: string) => {
    const actionKey = service ? `${action}-${service}` : action;
    setActionLoading(actionKey);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/mcp-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, service }),
      });

      const data = await res.json();

      if (data.success) {
        const serviceName = service ? SERVICE_DISPLAY_NAMES[service] || service : 'all services';
        setMessage(`${action === 'start' ? 'Started' : action === 'stop' ? 'Stopped' : 'Restarted'} ${serviceName}`);
        setServices(data.services);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error || 'Action failed');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error performing action:', err);
      setError('Action failed');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string, health?: string, available?: boolean) => {
    if (status === 'running') {
      if (available === false) return 'bg-orange-500';
      if (health === 'healthy') return 'bg-green-500';
      if (health === 'starting') return 'bg-yellow-500';
      return 'bg-blue-500';
    }
    if (status === 'stopped') return 'bg-gray-400';
    if (status === 'error') return 'bg-red-500';
    return 'bg-gray-300';
  };

  const getStatusText = (status: string, health?: string, available?: boolean) => {
    if (status === 'running') {
      if (available === false) return 'Not Responding';
      if (health === 'healthy') return 'Healthy';
      if (health === 'starting') return 'Starting';
      if (health === 'unhealthy') return 'Unhealthy';
      return 'Running';
    }
    if (status === 'stopped') return 'Stopped';
    if (status === 'error') return 'Error';
    return 'Unknown';
  };

  const allRunning = services.length > 0 && services.every(s => s.status === 'running');
  const allStopped = services.length > 0 && services.every(s => s.status === 'stopped');

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-6 border border-slate-200 dark:border-slate-700">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          MCP Services
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAction('start')}
            disabled={!!actionLoading || allRunning}
            className="w-20 px-2 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors text-center"
          >
            {actionLoading === 'start' ? '...' : 'Start All'}
          </button>
          <button
            onClick={() => handleAction('stop')}
            disabled={!!actionLoading || allStopped}
            className="w-20 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors text-center"
          >
            {actionLoading === 'stop' ? '...' : 'Stop All'}
          </button>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="w-24 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors text-center"
          >
            {discovering ? '...' : 'Discover'}
          </button>
        </div>
      </div>

      {/* Discovered Servers */}
      {discoveredServers.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Discovered Servers ({discoveredServers.length}):
          </div>
          <div className="space-y-1">
            {discoveredServers.map((server, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="text-blue-600 dark:text-blue-400">🖥️</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{server.ip}</span>
                {server.user && (
                  <span className="text-slate-500 dark:text-slate-400">(user: {server.user})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className="mb-4 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Services List */}
      <div className="space-y-2">
        {services.length === 0 && (
          <div className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">
            No services found. Click &quot;Start All&quot; to initialize MCP services.
          </div>
        )}

        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{SERVICE_ICONS[service.name] || '🔧'}</span>
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {SERVICE_DISPLAY_NAMES[service.name] || service.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Port: {service.port}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-28">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(service.status, service.health, service.available)}`}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                  {getStatusText(service.status, service.health, service.available)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {service.status !== 'running' ? (
                  <button
                    onClick={() => handleAction('start', service.name)}
                    disabled={!!actionLoading}
                    className="w-12 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors text-center"
                  >
                    {actionLoading === `start-${service.name}` ? '...' : 'Start'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('stop', service.name)}
                    disabled={!!actionLoading}
                    className="w-12 px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors text-center"
                  >
                    {actionLoading === `stop-${service.name}` ? '...' : 'Stop'}
                  </button>
                )}
                <button
                  onClick={() => handleAction('restart', service.name)}
                  disabled={!!actionLoading}
                  className="w-14 px-2 py-1 bg-slate-500 hover:bg-slate-600 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors text-center"
                >
                  {actionLoading === `restart-${service.name}` ? '...' : 'Restart'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
