"use client";
import { useState, useEffect, useCallback } from 'react';
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
  isExecutingStreamlit: boolean;
  isLlmTimerRunning: boolean;
  handleExecuteScript: () => void;
  handleExecuteStreamlit: () => void;
  stopExecution?: () => void;
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

const ExecutionTab = ({
  isExecutingScript,
  isExecutingStreamlit,
  isLlmTimerRunning,
  handleExecuteScript,
  handleExecuteStreamlit,
  stopExecution,
  finalExecutionStatus,
  hasExecutionAttempted,
  scriptExecutionDuration,
  scriptTimerKey,
  executionStartTime,
  // dockerCommandToDisplay, // Removed as per request (implied by "Execution Logs" removal context or just cleaning) - actually user said remove "Execution Logs" and "Generated Project Files". I will keep docker command if it's not strictly "Execution Logs", but usually it goes together. I'll keep generic status info but remove the big log dump.
  // scriptLogOutput, // Removed usage
  phasedOutputs,
  scriptExecutionError,
  // finalExecutionResult, // Used for JSON view - I'll keep it if it's not "Generated Files" or "Logs", but maybe user wants clean UI. I'll remove raw JSON too to be cleaner.
  projectName
}: ExecutionTabProps) => {
  const [outputs, setOutputs] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const fetchOutputs = useCallback(async () => {
    try {
      let url = '/api/project-config';
      if (projectName) {
        url += `?project=${encodeURIComponent(projectName)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.outputs && Array.isArray(data.outputs)) {
          setOutputs(data.outputs);
        }
      }
    } catch (error) {
      console.error("Failed to fetch project outputs:", error);
    }
  }, [projectName]);

  // Fetch on mount and when execution finishes
  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

  useEffect(() => {
    if (finalExecutionStatus === 'success') {
      fetchOutputs();
    }
  }, [finalExecutionStatus, fetchOutputs]);

  const getFileUrl = (path: string) => {
    let url = `/api/files?file=${encodeURIComponent(path)}`;
    if (projectName) {
      url += `&project=${encodeURIComponent(projectName)}`;
    }
    return url;
  };

  const isHtml = (path: string) => path.toLowerCase().endsWith('.html');

  const getAllOutputsText = () => {
    return phasedOutputs.map(out => `${out.taskName}:\n${out.output}`).join('\n\n' + '-'.repeat(40) + '\n\n');
  };

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">
        Run {projectName ? `(${projectName})` : ''}
      </h2>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleExecuteScript}
          disabled={isExecutingScript || isLlmTimerRunning}
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
        <button
          type="button"
          onClick={handleExecuteStreamlit}
          disabled={isExecutingStreamlit}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-6 py-3 rounded-xl shadow-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:bg-gray-400 focus:ring-4 focus:ring-indigo-300 focus:outline-none dark:focus:ring-indigo-800 flex items-center justify-center gap-2 mb-6"
        >
          {isExecutingStreamlit ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Executing...
            </span>
          ) : 'Run Streamlit'}
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

        {isExecutingStreamlit && (
          <button
            type="button"
            onClick={stopExecution}
            className="bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-6 py-3 rounded-xl shadow-lg transition duration-200 ease-in-out transform hover:scale-105 focus:ring-4 focus:ring-red-300 focus:outline-none dark:focus:ring-red-800 mb-6"
          >
            Stop Streamlit
          </button>
        )}
      </div>

      <LiveCrewActivity
        key={scriptTimerKey}
        isExecutingScript={isExecutingScript}
        projectName={projectName}
      />

      {/* Execution Status Block */}
      <div className="mt-6">
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

        {scriptExecutionError && !finalExecutionStatus && (
          <div className="mt-4 p-3 border border-red-400 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400">
            <p className="font-semibold">Execution Error:</p>
            <p>{scriptExecutionError}</p>
          </div>
        )}
      </div>



      {/* New Outputs / Artifacts Section */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">
          Outputs
        </h3>

        {outputs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            No outputs generated yet.
          </div>
        ) : (
          <div className="grid grid-col-1 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <ul className="space-y-2">
                {outputs.map((output, idx) => {
                  // Clean up path for display
                  const displayName = output.split('/').pop() || output;
                  return (
                    <li key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                      <span className="font-mono text-sm text-slate-700 dark:text-slate-200 truncate mr-4">
                        {displayName}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewFile(output)}
                          className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                        >
                          Preview
                        </button>
                        <a
                          href={getFileUrl(output)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-sm bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                        >
                          Open New Tab
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Preview Section */}
            {previewFile && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Preview: {previewFile.split('/').pop()}
                  </span>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Close
                  </button>
                </div>
                <div className="h-[500px] w-full relative">
                  {isHtml(previewFile) ? (
                    <iframe
                      src={getFileUrl(previewFile)}
                      className="w-full h-full border-0 bg-white"
                      title="Output Preview"
                    />
                  ) : (
                    <div className="w-full h-full p-4 overflow-auto">
                      <iframe
                        src={getFileUrl(previewFile)}
                        className="w-full h-full border-0 bg-transparent"
                        title="Output Text Preview"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phased Outputs - moved to bottom as per request */}
      {phasedOutputs.length > 0 && (
        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Step Outputs</h3>
            <CopyButton textToCopy={getAllOutputsText()} />
          </div>
          <ul className="space-y-4">
            {phasedOutputs.map((out, index) => (
              <li key={index} className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 shadow-sm relative">
                <div className="flex justify-between items-start mb-2">
                  <strong className="text-sm font-medium text-indigo-600 dark:text-indigo-400 pr-8">{out.taskName}</strong>
                </div>
                <div className="relative">
                  <pre className="mt-1 p-3 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-auto resize-y min-h-[100px] max-h-[500px] rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                    {out.output}
                  </pre>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </section>
  );
};

export default ExecutionTab;