"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ExecutionTab from '../components/ExecutionTab';
import ProjectList from '../components/ProjectList';
import DockerContainerManager from '../components/DockerContainerManager';
import { useExecutionContext } from '@/context/ExecutionContext';

export default function Dashboard() {
    const [projects, setProjects] = useState<{ name: string; path: string; description: string }[]>([]);
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

    // Extract all container IDs from execution states
    const activeContainerIds = Object.values(executionStates)
        .map(state => state.containerId)
        .filter((id): id is string => !!id);

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

                {/* Docker Container Manager */}
                <DockerContainerManager projectContainerIds={activeContainerIds} />

                {error && (
                    <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                {loading ? (
                    <p>Loading projects...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        <ProjectList
                            projects={projects}
                            selectedProject={selectedProject}
                            onSelectProject={setSelectedProject}
                            onRunProject={handleRunProject}
                            onDeleteProject={handleDeleteProject}
                            executionStates={executionStates}
                        />
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
                            streamlitUrl={activeProjectState?.streamlitUrl || null}
                        />
                    </div>
                )}

            </div>
        </div>
    );
}
