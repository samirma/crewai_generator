"use client";

import React, { createContext, useContext, useState, useRef, ReactNode, useCallback, useEffect } from 'react';
import type { ExecutionResult as ExecutionResultType } from '../app/api/execute/types';
import { parsePhasedOutputsFromStdout } from '@/utils/outputParser';

export interface PhasedOutput {
    taskName: string;
    output: string;
}

export interface ProjectExecutionState {
    isExecutingScript: boolean;
    scriptExecutionError: string;
    scriptLogOutput: string[];
    dockerCommandToDisplay: string;
    phasedOutputs: PhasedOutput[];
    scriptExecutionDuration: number | null;
    hasExecutionAttempted: boolean;
    scriptTimerKey: number;
    containerId: string | null;
    finalExecutionStatus: string | null;
    finalExecutionResult: ExecutionResultType | null;
    isStopRequested: boolean;
    executionStartTime: number | null;
    streamlitUrl: string | null;
}

const initialProjectState: ProjectExecutionState = {
    isExecutingScript: false,
    scriptExecutionError: "",
    scriptLogOutput: [],
    dockerCommandToDisplay: "",
    phasedOutputs: [],
    scriptExecutionDuration: null,
    hasExecutionAttempted: false,
    scriptTimerKey: 0,
    containerId: null,
    finalExecutionStatus: null,
    finalExecutionResult: null,
    isStopRequested: false,
    executionStartTime: null,
    streamlitUrl: null,
};

interface ExecutionContextType {
    executionStates: Record<string, ProjectExecutionState>; // Key is projectName or 'default'
    handleExecuteScript: (projectName?: string, scriptName?: string) => Promise<void>;
    stopExecution: (projectName?: string) => Promise<void>;
    resetExecutionState: (projectName?: string) => void;
    playSuccessSound: () => void;
    playErrorSound: () => void;
    getProjectState: (projectName?: string) => ProjectExecutionState;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

export const ExecutionProvider = ({ children }: { children: ReactNode }) => {
    // Master state: Map of project names to their state
    const [executionStates, setExecutionStates] = useState<Record<string, ProjectExecutionState>>({});
    const executionStatesRef = useRef(executionStates);

    useEffect(() => {
        executionStatesRef.current = executionStates;
    }, [executionStates]);

    const scriptSuccessSoundRef = useRef<HTMLAudioElement | null>(null);
    const scriptErrorSoundRef = useRef<HTMLAudioElement | null>(null);

    // Helper to update a specific project's state
    const updateProjectState = useCallback((projectName: string, updates: Partial<ProjectExecutionState> | ((prev: ProjectExecutionState) => Partial<ProjectExecutionState>)) => {
        setExecutionStates(prev => {
            const currentState = prev[projectName] || initialProjectState;
            const newValues = typeof updates === 'function' ? updates(currentState) : updates;

            return {
                ...prev,
                [projectName]: {
                    ...currentState,
                    ...newValues
                }
            };
        });
    }, []);

    const getProjectState = useCallback((projectName: string = 'default') => {
        return executionStates[projectName] || initialProjectState;
    }, [executionStates]);

    const playSuccessSound = useCallback(() => {
        scriptSuccessSoundRef.current?.play().catch(e => console.error("Error playing success sound:", e));
    }, []);

    const playErrorSound = useCallback(() => {
        scriptErrorSoundRef.current?.play().catch(e => console.error("Error playing error sound:", e));
    }, []);

    const stopExecution = useCallback(async (projectName: string = 'default') => {
        const currentState = executionStates[projectName];
        if (!currentState || !currentState.containerId) return;

        const containerId = currentState.containerId;

        try {
            updateProjectState(projectName, prev => ({
                scriptLogOutput: [...prev.scriptLogOutput, "LOG: Requesting container stop..."],
                isStopRequested: true,
                streamlitUrl: null // Clear Streamlit URL to hide the button immediately
            }));

            const response = await fetch('/api/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ containerId }),
            });
            const data = await response.json();

            if (response.ok) {
                updateProjectState(projectName, prev => ({
                    scriptLogOutput: [...prev.scriptLogOutput, "LOG: Container stopped by user request."]
                }));
            } else {
                updateProjectState(projectName, prev => ({
                    scriptLogOutput: [...prev.scriptLogOutput, `LOG_ERROR: Failed to stop container: ${data.error}`]
                }));
            }
        } catch (error) {
            console.error("Error stopping execution:", error);
            updateProjectState(projectName, prev => ({
                scriptLogOutput: [...prev.scriptLogOutput, "LOG_ERROR: Failed to send stop request."]
            }));
        }
    }, [executionStates, updateProjectState]);

    const resetExecutionState = useCallback((projectName: string = 'default') => {
        setExecutionStates(prev => ({
            ...prev,
            [projectName]: initialProjectState
        }));
    }, []);

    const handleExecuteScript = useCallback(async (projectName: string = 'default', scriptName?: string) => {
        // Reset state for this project
        updateProjectState(projectName, {
            ...initialProjectState,
            hasExecutionAttempted: true,
            isExecutingScript: true,
            scriptTimerKey: (executionStates[projectName]?.scriptTimerKey || 0) + 1,
            executionStartTime: Date.now(),
            streamlitUrl: null // Reset Streamlit URL
        });

        try {
            const bodyPayload: any = projectName === 'default' ? {} : { projectName };
            if (scriptName) {
                bodyPayload.scriptName = scriptName;
            }

            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyPayload),
            });

            if (!response.ok) {
                let errorText = `API request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorText = errorData.error || errorText;
                } catch { }
                playErrorSound();
                throw new Error(errorText);
            }
            if (!response.body) {
                playErrorSound();
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || ""; // Keep the incomplete line in buffer

                for (const line of lines) {
                    if (line.trim() === "") continue;
                    if (line.startsWith("CONTAINER_ID:")) {
                        const containerId = line.replace("CONTAINER_ID:", "").trim();
                        updateProjectState(projectName, { containerId });
                    } else if (line.startsWith("STREAMLIT_URL:") && scriptName === 'run_streamlit.sh') {
                        const url = line.replace("STREAMLIT_URL:", "").trim();
                        updateProjectState(projectName, { streamlitUrl: url });
                    } else if (line.startsWith("RESULT:")) {
                        try {
                            const resultJson = JSON.parse(line.replace("RESULT:", "").trim());
                            // Extract error message from the result if it failed
                            const errorMessage = resultJson.overallStatus === 'failure' && resultJson.mainScript?.stderr
                                ? resultJson.mainScript.stderr
                                : resultJson.error || '';
                            updateProjectState(projectName, {
                                finalExecutionResult: resultJson,
                                finalExecutionStatus: resultJson.overallStatus || "unknown",
                                isExecutingScript: false,
                                scriptExecutionDuration: (Date.now() - (executionStatesRef.current[projectName]?.executionStartTime || Date.now())) / 1000,
                                scriptExecutionError: errorMessage
                            });
                            if (resultJson.overallStatus === 'success') {
                                playSuccessSound();
                            } else {
                                playErrorSound();
                            }
                        } catch (e) {
                            console.error("Failed to parse RESULT JSON:", e);
                            updateProjectState(projectName, prev => ({
                                scriptLogOutput: [...prev.scriptLogOutput, `ERROR: Failed to parse result: ${e}`]
                            }));
                        }
                    } else if (line.startsWith("LOG:")) {
                        const logContent = line.replace("LOG:", "").trim();

                        updateProjectState(projectName, prev => {
                            const updates: Partial<ProjectExecutionState> = {
                                scriptLogOutput: [...prev.scriptLogOutput, logContent],
                                phasedOutputs: parsePhasedOutputsFromStdout([...prev.scriptLogOutput, logContent].join('\n'))
                            };

                            return updates;
                        });
                    } else if (line.startsWith("LOG_ERROR:")) {
                        const logContent = line.replace("LOG_ERROR:", "").trim();
                        updateProjectState(projectName, prev => ({
                            scriptLogOutput: [...prev.scriptLogOutput, `ERROR: ${logContent}`]
                        }));
                    } else {
                        // Default to log if no prefix (shouldn't happen with our API but good fallback)
                        updateProjectState(projectName, prev => ({
                            scriptLogOutput: [...prev.scriptLogOutput, line]
                        }));
                    }
                }
            }

            // Clean up any remaining buffer
            if (buffer.trim()) {
                updateProjectState(projectName, prev => ({
                    scriptLogOutput: [...prev.scriptLogOutput, buffer]
                }));
            }

            // Ensure we mark as finished if RESULT wasn't received (unexpected stream end)
            updateProjectState(projectName, prev => {
                if (prev.isExecutingScript) {
                    return {
                        isExecutingScript: false,
                        scriptExecutionDuration: (Date.now() - (prev.executionStartTime || Date.now())) / 1000
                    };
                }
                return {};
            });

        } catch (error: any) {
            console.error("Error executing script:", error);
            updateProjectState(projectName, {
                isExecutingScript: false,
                scriptExecutionError: error.message || "Unknown error occurred",
                scriptLogOutput: [...executionStates[projectName]?.scriptLogOutput || [], `ERROR: ${error.message}`]
            });
            playErrorSound();
        }
    }, [executionStates, updateProjectState, playSuccessSound, playErrorSound]);

    return (
        <ExecutionContext.Provider value={{
            executionStates,
            handleExecuteScript,
            stopExecution,
            resetExecutionState,
            playSuccessSound,
            playErrorSound,
            getProjectState
        }}>
            {children}
            {/* Hidden Audio Elements */}
            <audio ref={scriptSuccessSoundRef} src="/sounds/script_success.mp3" preload="auto" />
            <audio ref={scriptErrorSoundRef} src="/sounds/script_error.mp3" preload="auto" />
        </ExecutionContext.Provider>
    );
};

export const useExecutionContext = () => {
    const context = useContext(ExecutionContext);
    if (!context) {
        throw new Error('useExecutionContext must be used within an ExecutionProvider');
    }
    return context;
};
