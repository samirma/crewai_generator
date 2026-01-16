"use client";

import { useEffect, useState, useRef } from 'react';
import CopyButton from './CopyButton';

interface LiveCrewActivityProps {
    isExecutingScript: boolean;
    projectName?: string | null;
}

interface ActivityEvent {
    type: 'step' | 'task' | 'system';
    content: string;
    timestamp: number;
    id: string;
}

const LiveCrewActivity = ({
    isExecutingScript,
    projectName
}: LiveCrewActivityProps) => {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (!isExecutingScript) {
            return;
        }

        // Reset when starting new
        setEvents([]);

        const fetchExecutionLog = async () => {
            try {
                let url = `/api/project-structure?file=execution_log.json`;
                if (projectName) url += `&project=${encodeURIComponent(projectName)}`;

                const res = await fetch(url);
                if (res.ok) {
                    const text = await res.text();
                    const lines = text.trim().split('\n');
                    const parsedEvents = lines.map((line, idx) => {
                        try {
                            const parsed = JSON.parse(line);
                            return {
                                ...parsed,
                                timestamp: Date.now(),
                                id: `evt-${idx}`
                            } as ActivityEvent;
                        } catch (e) { return null; }
                    }).filter((x): x is ActivityEvent => x !== null);

                    setEvents(parsedEvents);
                }
            } catch (e) {
                // ignore errors during poll
            }
        };

        fetchExecutionLog();
        const interval = setInterval(fetchExecutionLog, 1000);
        return () => clearInterval(interval);
    }, [isExecutingScript, projectName]);

    // Auto-scroll history
    useEffect(() => {
        if (scrollRef.current && showHistory) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events, showHistory]);

    const latestStep = [...events].reverse().find(e => e.type === 'step');
    const completedTasks = events.filter(e => e.type === 'task');

    if (events.length === 0 && !isExecutingScript) {
        return null;
    }

    return (
        <div className="space-y-6 mb-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">

            <div className="flex items-center gap-3 mb-2">
                <div className="relative flex h-3 w-3">
                    {isExecutingScript && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isExecutingScript ? 'bg-indigo-500' : 'bg-slate-400'}`}></span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Live Crew Activity</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Latest Step Column */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Current Step
                        </h3>
                        <CopyButton textToCopy={latestStep?.content || ""} />
                    </div>
                    <div className={`flex-1 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-800 shadow-sm min-h-[160px] max-h-[400px] overflow-y-auto flex flex-col relative transition-all
              ${isExecutingScript ? 'ring-2 ring-indigo-500/10' : ''}`}>

                        {latestStep ? (
                            <div className="animate-event">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="text-slate-700 dark:text-slate-200 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                                        {latestStep.content}
                                    </p>
                                </div>
                                {isExecutingScript && (
                                    <div className="absolute bottom-4 right-4">
                                        <span className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm">
                                Waiting for agent steps...
                            </div>
                        )}
                    </div>
                </div>

                {/* Completed Tasks Column */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 flex justify-between items-center">
                        <span>Completed Tasks</span>
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                            {completedTasks.length}
                        </span>
                    </h3>
                    <div className="flex justify-end mb-2">
                        <CopyButton textToCopy={completedTasks.map(t => t.content).join('\n\n')} />
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-2 overflow-hidden flex flex-col max-h-[400px]">
                        {completedTasks.length > 0 ? (
                            <ul className="overflow-y-auto space-y-2 p-2 scroll-smooth">
                                {completedTasks.slice().reverse().map((task, i) => (
                                    <li key={i} className="animate-event p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-500 mt-1">✓</span>
                                            <span className="line-clamp-3 text-xs md:text-sm leading-relaxed">{task.content}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm p-4">
                                No tasks completed yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Collapsible Full History */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mx-auto"
                >
                    <span>{showHistory ? 'Hide Full Log' : 'Show Full Log'}</span>
                    <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`}
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>

                <div className={`transition-all duration-300 overflow-hidden ${showHistory ? 'max-h-[500px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div ref={scrollRef} className="bg-slate-900 text-slate-300 rounded-lg p-4 font-mono text-xs overflow-y-auto max-h-[300px] border border-slate-700 shadow-inner">
                        {events.map((e, i) => (
                            <div key={i} className="mb-1 border-b border-slate-800 pb-1 last:border-0">
                                <span className={`uppercase font-bold tracking-wider text-[10px] mr-2 
                   ${e.type === 'step' ? 'text-indigo-400' : e.type === 'task' ? 'text-green-400' : 'text-slate-500'}`}>
                                    [{e.type}]
                                </span>
                                <span>{e.content}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LiveCrewActivity;
