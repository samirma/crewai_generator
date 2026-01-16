"use client";
import { useState, useEffect, useMemo } from 'react';
import LiveCrewActivity from './LiveCrewActivity';
import CopyButton from './CopyButton';
import Timer from './Timer';
import type { ExecutionResult as ExecutionResultType } from '../api/execute/types';

interface PhasedOutput {
  taskName: string;
  output: string;
}

interface ExecutionTabProps {
  isExecutingScript: boolean;
  isLlmTimerRunning: boolean;
  handleExecuteScript: () => void;
  stopExecution?: () => void; // Optional for now until passed
  finalExecutionStatus: string | null;
  hasExecutionAttempted: boolean;
  scriptExecutionDuration: number | null;
  scriptTimerKey: number;
  executionStartTime?: number | null;
  dockerCommandToDisplay: string;
  scriptLogOutput: string[];
  phasedOutputs: PhasedOutput[];
  scriptExecutionError: string;
  finalExecutionResult: ExecutionResultType | null;
  projectName?: string | null;
}

interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileTreeNode[];
}

const FileTree = ({ tree, activeFile, setActiveFile }: { tree: FileTreeNode[], activeFile: string | null, setActiveFile: (path: string) => void }) => {
  const renderNode = (node: FileTreeNode, level: number) => (
    <div key={node.path} style={{ paddingLeft: `${level * 20}px` }}>
      <button
        onClick={() => node.type === 'file' && setActiveFile(node.path)}
        className={`w-full text-left px-2 py-1 rounded-md transition-colors ${activeFile === node.path
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
          : 'hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
      >
        {node.type === 'folder' ? '📁' : '📄'} {node.name}
      </button>
      {node.children &&
        node.children
          .sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
          })
          .map(child => renderNode(child, level + 1))
      }
    </div>
  );

  const uniqueTree = useMemo(() => {
    const seen = new Set();
    const filterDuplicates = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.filter(node => {
        if (node.name === '.venv' || node.name === '__pycache__') return false;
        const duplicate = seen.has(node.path);
        seen.add(node.path);
        if (node.children) {
          node.children = filterDuplicates(node.children);
        }
        return !duplicate;
      });
    };
    return filterDuplicates(tree);
  }, [tree]);

  return (
    <div>
      {uniqueTree.map(node => renderNode(node, 0))}
    </div>
  )
};

const ExecutionTab = ({
  isExecutingScript,
  isLlmTimerRunning,
  handleExecuteScript,
  stopExecution,
  finalExecutionStatus,
  hasExecutionAttempted,
  scriptExecutionDuration,
  scriptTimerKey,
  executionStartTime,
  dockerCommandToDisplay,
  scriptLogOutput,
  phasedOutputs,
  scriptExecutionError,
  finalExecutionResult,
  projectName
}: ExecutionTabProps) => {
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectStructure = async () => {
      try {
        let url = '/api/project-structure';
        if (projectName) {
          url += `?project=${encodeURIComponent(projectName)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch project structure');
        }
        const tree = await response.json();
        setFileTree(tree);
        if (tree.length > 0) {
          const firstFile = findFirstFile(tree);
          if (firstFile) {
            setActiveFile(firstFile.path);
          }
        } else {
          setFileTree([]);
          setActiveFile(null);
          setActiveFileContent(null);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchProjectStructure();
  }, [projectName]); // Re-fetch when projectName changes

  useEffect(() => {
    const fetchFileContent = async () => {
      if (activeFile) {
        try {
          let url = `/api/project-structure?file=${encodeURIComponent(activeFile)}`;
          if (projectName) {
            url += `&project=${encodeURIComponent(projectName)}`;
          }
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('Failed to fetch file content');
          }
          const content = await response.text();
          setActiveFileContent(content);
        } catch (error) {
          console.error(error);
          setActiveFileContent('Error loading file content.');
        }
      }
    };

    fetchFileContent();
  }, [activeFile, projectName]);



  const findFirstFile = (nodes: FileTreeNode[]): FileTreeNode | null => {
    for (const node of nodes) {
      if (node.type === 'file') {
        return node;
      }
      if (node.children) {
        const firstFile = findFirstFile(node.children);
        if (firstFile) {
          return firstFile;
        }
      }
    }
    return null;
  };

  const scriptIsEmpty = fileTree.length === 0 && !projectName; // If in project mode, it might be empty but valid to run if pre-built? usually not.

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
        Script Execution {projectName ? `(${projectName})` : ''}
      </h2>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleExecuteScript}
          disabled={
            isExecutingScript ||
            isLlmTimerRunning
          }
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-6 py-3 rounded-xl shadow-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:bg-gray-400 focus:ring-4 focus:ring-indigo-300 focus:outline-none dark:focus:ring-indigo-800 flex items-center justify-center gap-2 mb-6"
        >
          {isExecutingScript ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Executing...
            </span>
          ) : 'Run'}
        </button>

        {isExecutingScript && stopExecution && (
          <button
            type="button"
            onClick={stopExecution}
            className="bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-6 py-3 rounded-xl shadow-lg transition duration-200 ease-in-out transform hover:scale-105 focus:ring-4 focus:ring-red-300 focus:outline-none dark:focus:ring-red-800 mb-6"
          >
            Stop
          </button>
        )}
      </div>

      <LiveCrewActivity
        key={scriptTimerKey}
        isExecutingScript={isExecutingScript}
        projectName={projectName}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 bg-slate-50 dark:bg-slate-700">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-3">
            Generated Project Files
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-r border-slate-200 dark:border-slate-600 pr-2">
              <FileTree tree={fileTree} activeFile={activeFile} setActiveFile={setActiveFile} />
            </div>
            <div className="relative bg-slate-100 dark:bg-slate-900 rounded-md p-2 min-h-[200px]">
              <pre className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap overflow-auto h-full max-h-[400px]">
                {activeFileContent || 'Select a file to view its content.'}
              </pre>
              {activeFileContent && (
                <div className="absolute top-2 right-2">
                  <CopyButton textToCopy={activeFileContent} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 shadow-sm min-h-[300px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">
              Execution Output & Logs
            </h3>

            {finalExecutionStatus && (
              <div className={`mb-4 p-3 rounded-md text-center font-semibold text-lg
                ${finalExecutionStatus === 'success'
                  ? 'bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                  : finalExecutionStatus === 'stopped'
                    ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                    : 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                Status: {finalExecutionStatus.charAt(0).toUpperCase() + finalExecutionStatus.slice(1)}
              </div>
            )}

            {(isExecutingScript || (hasExecutionAttempted && scriptExecutionDuration !== null)) && (
              <div className="mb-4 p-3 border border-green-300 dark:border-green-700 rounded-md bg-green-50 dark:bg-green-900/30 shadow-sm text-center">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Execution Timer: <Timer key={scriptTimerKey} isRunning={isExecutingScript} startTime={executionStartTime} className="inline font-semibold" />
                </p>
              </div>
            )}
            {scriptExecutionDuration !== null && !isExecutingScript && (
              <div className="mb-4 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Execution took: <span className="font-semibold">{scriptExecutionDuration.toFixed(2)}</span> seconds
                </p>
              </div >
            )}

            {dockerCommandToDisplay && (
              <details className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
                <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex justify-between items-center">
                  <span>Docker Command Used</span>
                  <CopyButton textToCopy={dockerCommandToDisplay} />
                </summary>
                <pre className="mt-2 p-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-[150px]">
                  {dockerCommandToDisplay}
                </pre>
              </details>
            )}

            <div className="flex-1 flex flex-col mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">
                  {isExecutingScript ? "Execution Logs (Streaming...)" : "Execution Logs:"}
                </h4>
                <CopyButton textToCopy={scriptLogOutput.join('\n')} />
              </div>
              {(scriptLogOutput.length > 0 || isExecutingScript) ? (
                <pre className="flex-1 p-3 border border-slate-300 rounded-md bg-slate-100 shadow-inner overflow-auto whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300 dark:bg-slate-900 dark:border-slate-600">
                  {scriptLogOutput.length > 0 ? scriptLogOutput.join('\n') : "Waiting for script output..."}
                </pre>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No logs produced yet.</p>
              )}
            </div>

            {phasedOutputs.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2">Task Outputs:</h4>
                <ul className="space-y-3">
                  {phasedOutputs.map((out, index) => (
                    <li key={index} className="p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 shadow-sm relative">
                      <div className="flex justify-between items-start">
                        <strong className="text-sm text-indigo-600 dark:text-indigo-400 pr-2">{out.taskName}:</strong>
                        <div className="absolute top-2 right-2">
                          <CopyButton textToCopy={out.output} />
                        </div>
                      </div>
                      <pre className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-[100px]">{out.output}</pre>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scriptExecutionError && !finalExecutionStatus && (
              <div className="mt-4 p-3 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
                <p className="font-semibold">Execution Error:</p>
                <p>{scriptExecutionError}</p>
              </div>
            )}

            {finalExecutionStatus && finalExecutionResult && (
              <details className="mt-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-inner" open={false}>
                <summary className="text-md font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  View Raw Execution Result JSON
                </summary>
                <pre className="mt-2 p-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-[300px]">
                  {JSON.stringify(finalExecutionResult, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExecutionTab;