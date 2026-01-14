"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ExecutionTab from '../components/ExecutionTab';
import { useExecutionContext } from '@/context/ExecutionContext';

export default function Dashboard() {
    const [projects, setProjects] = useState<{ name: string; path: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedProject, setSelectedProject] = useState<string | null>(null);

    const {
        executionStates,
        handleExecuteScript,
        stopExecution
    } = useExecutionContext();


    // Custom execution handler
    const handleRunProject = async (projectName: string) => {
        // If this specific project is already running, do nothing (or we could focus it)
        const projectState = executionStates[projectName];
        if (projectState?.isExecutingScript) return;

        setSelectedProject(projectName);
        await handleExecuteScript(projectName);
    };

    const handleDeleteProject = async (projectName: string) => {
        if (!confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch('/api/projects', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: projectName }),
            });

            if (response.ok) {
                // Remove from state
                setProjects(prev => prev.filter(p => p.name !== projectName));
                // If the deleted project was selected, deselect it
                if (selectedProject === projectName) {
                    setSelectedProject(null);
                }
            } else {
                const data = await response.json();
                alert(`Failed to delete project: ${data.error}`);
            }
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("An error occurred while deleting the project.");
        }
    };

    useEffect(() => {
        fetch('/api/projects')
            .then(res => res.json())
            .then(data => {
                if (data.projects) {
                    setProjects(data.projects);
                } else {
                    setError('Failed to load projects');
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Get state for the selected project to pass to ExecutionTab
    const activeProjectState = selectedProject ? executionStates[selectedProject] : null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-inter p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <h1 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400">
                        Project Dashboard
                    </h1>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors font-medium"
                    >
                        &larr; Back to Generator
                    </Link>
                </header>

                {error && (
                    <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                {loading ? (
                    <p>Loading projects...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {projects.length === 0 ? (
                            <p className="col-span-full text-center text-slate-500">No projects found. Create and save one from the Generator!</p>
                        ) : (
                            projects.map(project => {
                                const isSelected = selectedProject === project.name;
                                // Check global state for execution status
                                const isRunningThis = executionStates[project.name]?.isExecutingScript;

                                return (
                                    <div
                                        key={project.name}
                                        onClick={() => setSelectedProject(project.name)}
                                        className={`p-6 rounded-lg shadow-md transition-all border flex flex-col cursor-pointer
                                            ${isSelected
                                                ? 'bg-indigo-50 dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold break-words">{project.name}</h3>
                                            {isRunningThis && (
                                                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300 animate-pulse">
                                                    Running
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4 break-all font-mono bg-slate-100 dark:bg-slate-900 p-1 rounded">{project.path}</p>
                                        <div className="mt-auto flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRunProject(project.name);
                                                }}
                                                disabled={isRunningThis}
                                                className={`flex-1 px-4 py-2 rounded-md transition-colors font-medium text-white
                                                    ${isRunningThis
                                                        ? 'bg-green-600 hover:bg-green-700'
                                                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400'
                                                    }`}
                                            >
                                                {isRunningThis ? 'Running...' : 'Run Project'}
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteProject(project.name);
                                                }}
                                                // Disable delete if running
                                                disabled={isRunningThis}
                                                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete Project"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Execution Output Area - Only show if we selected a project and started running */}
                {(selectedProject) && (
                    <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-8">
                        <h2 className="text-2xl font-bold mb-4">Execution Output: {selectedProject}</h2>
                        <ExecutionTab
                            isExecutingScript={activeProjectState?.isExecutingScript || false}
                            isLlmTimerRunning={false}
                            handleExecuteScript={() => selectedProject && handleRunProject(selectedProject)}
                            stopExecution={() => selectedProject && stopExecution(selectedProject)}
                            finalExecutionStatus={activeProjectState?.finalExecutionStatus || null}
                            hasExecutionAttempted={activeProjectState?.hasExecutionAttempted || false}
                            scriptExecutionDuration={activeProjectState?.scriptExecutionDuration || null}
                            scriptTimerKey={activeProjectState?.scriptTimerKey || 0}
                            executionStartTime={activeProjectState?.executionStartTime || null}
                            dockerCommandToDisplay={activeProjectState?.dockerCommandToDisplay || ""}
                            scriptLogOutput={activeProjectState?.scriptLogOutput || []}
                            phasedOutputs={activeProjectState?.phasedOutputs || []}
                            scriptExecutionError={activeProjectState?.scriptExecutionError || ""}
                            finalExecutionResult={activeProjectState?.finalExecutionResult || null}
                            projectName={selectedProject} // Pass projectName to context-aware file explorer
                        />
                    </div>
                )}

            </div>
        </div>
    );
}
