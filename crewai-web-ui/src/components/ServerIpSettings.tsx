import React, { useState, useEffect } from 'react';

export default function ServerIpSettings() {
    const [ip, setIp] = useState<string>('');
    const [port, setPort] = useState<number>(8080);
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        fetchIp();
    }, []);

    const fetchIp = async (force: boolean = false) => {
        setLoading(true);
        if (force) setMessage('Discovering...');
        try {
            const url = force ? '/api/settings/server-ip?force=true' : '/api/settings/server-ip';
            const res = await fetch(url);
            const data = await res.json();
            if (data.ip) {
                setIp(data.ip);
            }
            if (data.port) {
                setPort(data.port);
            }
            if (force) {
                setMessage(data.ip ? 'Discovery successful!' : 'Discovery failed.');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error fetching IP:', error);
            if (force) setMessage('Discovery error.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/settings/server-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Saved successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Error saving.');
            }
        } catch (error) {
            console.error('Error saving:', error);
            setMessage('Error saving.');
        } finally {
            setLoading(false);
        }
    };

    const handleDiscover = () => {
        fetchIp(true);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-6 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Server IP:</span>
                    <input
                        type="text"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                        placeholder="192.168.1.x"
                        className="w-32 sm:w-40 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Port:</span>
                    <input
                        type="number"
                        value={port}
                        onChange={(e) => setPort(parseInt(e.target.value, 10))}
                        placeholder="8080"
                        className="w-20 sm:w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                    onClick={handleDiscover}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    Discover Server
                </button>
            </div>
            {message && <span className="text-sm text-green-600 dark:text-green-400 animate-fade-in">{message}</span>}
        </div>
    );
}
