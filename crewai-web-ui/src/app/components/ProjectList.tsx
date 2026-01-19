import React from 'react';

interface Project {
    name: string;
    path: string;
    description: string;
}

interface ProjectListProps {
    projects: Project[];
    selectedProject: string | null;
    onSelectProject: (projectName: string) => void;
    onRunProject: (projectName: string) => void;
    onDeleteProject: (projectName: string) => void;
    executionStates: Record<string, any>;
}

export default function ProjectList({
    projects,
    selectedProject,
    onSelectProject,
    onRunProject,
    onDeleteProject,
    executionStates
}: ProjectListProps) {
    if (projects.length === 0) {
        return (
            <p className="col-span-full text-center text-slate-500">
                No projects found. Create and save one from the Generator!
            </p>
        );
    }

    return (
        <>
            {projects.map(project => {
                const isSelected = selectedProject === project.name;
                // Check global state for execution status
                const isRunningThis = executionStates[project.name]?.isExecutingScript;

                return (
                    <div
                        key={project.name}
                        onClick={() => onSelectProject(project.name)}
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
                        <p className="text-xs text-slate-500 mb-2 break-all font-mono bg-slate-100 dark:bg-slate-900 p-1 rounded">
                            {project.path}
                        </p>
                        {project.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                {project.description}
                            </p>
                        )}
                        <div className="mt-auto flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRunProject(project.name);
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
                                    onDeleteProject(project.name);
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
            })}
        </>
    );
}
