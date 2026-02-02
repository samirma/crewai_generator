"use client";

import { useState, useEffect } from 'react';

interface Container {
  id: string;
  names: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

interface DockerContainerManagerProps {
  projectContainerIds?: string[];
}

export default function DockerContainerManager({ projectContainerIds = [] }: DockerContainerManagerProps) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [closingContainerId, setClosingContainerId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchContainers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/containers');
      if (!response.ok) {
        throw new Error('Failed to fetch containers');
      }
      const data = await response.json();
      setContainers(data.containers || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const closeContainer = async (containerId: string) => {
    setClosingContainerId(containerId);
    try {
      const response = await fetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to stop container');
      }

      await fetchContainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close container');
    } finally {
      setClosingContainerId(null);
    }
  };

  const closeAllContainers = async () => {
    if (!confirm(`Are you sure you want to close all ${containers.length} containers?`)) {
      return;
    }

    for (const container of containers) {
      if (container.state === 'running') {
        await closeContainer(container.id);
      }
    }
  };

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, []);

  const runningContainers = containers.filter(c => c.state === 'running');
  const isAppContainer = (containerId: string) => projectContainerIds.includes(containerId);

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">
          Docker Containers
          {runningContainers.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm rounded-full">
              {runningContainers.length} running
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={fetchContainers}
            disabled={loading}
            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </span>
            )}
          </button>
          {runningContainers.length > 0 && (
            <button
              onClick={closeAllContainers}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-medium"
            >
              Close All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {containers.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p>No Docker containers found</p>
          <p className="text-sm mt-1">Containers created by the app will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Container ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ports</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container, index) => (
                <tr
                  key={container.id}
                  className={`bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    isAppContainer(container.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${index === containers.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{container.id}</span>
                      {isAppContainer(container.id) && (
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                          App
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{container.names}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{container.image}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        container.state === 'running'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : container.state === 'exited'
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}
                    >
                      {container.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                    {container.ports !== 'None' ? container.ports : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                    {container.created}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {container.state === 'running' && (
                      <button
                        onClick={() => closeContainer(container.id)}
                        disabled={closingContainerId === container.id}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {closingContainerId === container.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Closing...
                          </span>
                        ) : (
                          'Close'
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-right">
        Last refreshed: {lastRefresh.toLocaleTimeString()}
      </div>
    </section>
  );
}
