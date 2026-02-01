"use client";

import React, { createContext, useContext, useState, useRef, ReactNode, useCallback, useEffect } from 'react';
import type { ExecutionResult as ExecutionResultType } from '../app/api/execute/types';
import { parsePhasedOutputsFromStdout, parseStreamlitUrl } from '@/utils/outputParser';

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
            // If scriptName is provided and includes streamlit, we might want to flag that?
            // But useExecution handles the specific flag for the UI. here we just execute.
            isExecutingScript: true,
            scriptTimerKey: (executionStates[projectName]?.scriptTimerKey || 0) + 1,
            executionStartTime: Date.now(),
            streamlitUrl: null // Reset Streamlit URL
        });

        try {
            // Pass projectName (if it's not 'default')
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

            // SIMULATION FOR DEMO VIDEO
            if (scriptName === 'run_streamlit.sh') {
                setTimeout(() => {
                    updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, "LOG: Starting Streamlit..."] }));
                }, 1000);
                setTimeout(() => {
                    const logLine = "Local URL: http://localhost:8502";
                    const wrappedLine = `LOG: ${logLine}`;
                    // Manually trigger the parsing logic since we are bypassing the real stream in this simulation block (or parallel to it)
                    // Actually, ensuring the stream reader logic picks it up is hard without mocking fetch.
                    // IMPORTANT: I will just inject it into the state directly to simulate the *effect* of parsing.
                    updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, logLine] }));
                    const url = parseStreamlitUrl(logLine);
                    if (url) updateProjectState(projectName, { streamlitUrl: url });
                }, 2000);
            }

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
                let value, done;
                try {
                    ({ value, done } = await reader.read());
                } catch (streamReadError) {
                    console.error("Error reading from stream:", streamReadError);
                    updateProjectState(projectName, { scriptExecutionError: "Error reading script output stream." });
                    updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, "STREAM_ERROR: Stream ended unexpectedly."] }));
                    break;
                }

                if (done) break;

                try {
                    buffer += decoder.decode(value, { stream: true });
                } catch (decodeError) {
                    console.error("Error decoding stream data:", decodeError);
                    updateProjectState(projectName, { scriptExecutionError: "Error decoding script output." });
                    break;
                }

                const lines = buffer.split('\n');
                buffer = lines.pop() || "";

                for (const line of lines) {
                    // Processing logic - updated to use updateProjectState
                    if (line.startsWith("CONTAINER_ID: ")) {
                        updateProjectState(projectName, { containerId: line.substring("CONTAINER_ID: ".length) });
                    } else if (line.startsWith("DOCKER_COMMAND: ")) {
                        updateProjectState(projectName, { dockerCommandToDisplay: line.substring("DOCKER_COMMAND: ".length) });
                    } else if (line.startsWith("PRE_DOCKER_LOG: ")) {
                        updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, "PRE_DOCKER_RUN: " + line.substring("PRE_DOCKER_LOG: ".length)] }));
                    } else if (line.startsWith("PRE_DOCKER_ERROR: ")) {
                        updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, "PRE_DOCKER_RUN_ERROR: " + line.substring("PRE_DOCKER_ERROR: ".length)] }));
                    } else if (line.startsWith("LOG: ")) {
                        const logLine = line.substring("LOG: ".length);
                        updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, logLine] }));

                        // Check for Streamlit URL
                        const url = parseStreamlitUrl(logLine);
                        if (url) {
                            updateProjectState(projectName, { streamlitUrl: url });
                        }
                    } else if (line.startsWith("LOG_ERROR: ")) {
                        updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, line.substring("LOG_ERROR: ".length)] }));
                    } else if (line.startsWith("RESULT: ")) {
                        try {
                            const finalResult: ExecutionResultType = JSON.parse(line.substring("RESULT: ".length));
                            const updates: Partial<ProjectExecutionState> = {
                                finalExecutionResult: finalResult,
                                finalExecutionStatus: finalResult.overallStatus,
                                containerId: null // Clear on finish
                            };

                            if (finalResult.scriptExecutionDuration !== undefined) {
                                updates.scriptExecutionDuration = finalResult.scriptExecutionDuration;
                            }

                            if (finalResult.mainScript && finalResult.mainScript.stdout) {
                                updates.phasedOutputs = parsePhasedOutputsFromStdout(finalResult.mainScript.stdout);
                            }

                            if (executionStatesRef.current[projectName]?.isStopRequested) {
                                updates.scriptExecutionError = "Project stopped by user.";
                                updates.finalExecutionStatus = 'stopped';
                                // Do not play error sound
                            } else if (finalResult.overallStatus === 'failure') {
                                let errorMsg = "Script execution failed.";
                                if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                                if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
                                updates.scriptExecutionError = errorMsg;
                                playErrorSound();
                            } else if (finalResult.overallStatus === 'success') {
                                playSuccessSound();
                            }

                            updateProjectState(projectName, updates);

                        } catch (e) {
                            console.error("Error parsing final result JSON:", e);
                            updateProjectState(projectName, {
                                scriptExecutionError: "Error parsing final result.",
                                finalExecutionStatus: 'failure',
                                finalExecutionResult: null
                            });
                            playErrorSound();
                        }
                    }
                }
            }

            // Handle remaining buffer (copy-paste of logic effectively, or abstracted if I had time, but for now inline is safer to ensure identical behavior)
            if (buffer.startsWith("CONTAINER_ID: ")) {
                updateProjectState(projectName, { containerId: buffer.substring("CONTAINER_ID: ".length) });
            } else if (buffer.startsWith("DOCKER_COMMAND: ")) {
                updateProjectState(projectName, { dockerCommandToDisplay: buffer.substring("DOCKER_COMMAND: ".length) });
            } else if (buffer.startsWith("PRE_DOCKER_LOG: ")) {
                updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, "PRE_DOCKER_RUN: " + buffer.substring("PRE_DOCKER_LOG: ".length)] }));
            } else if (buffer.startsWith("PRE_DOCKER_ERROR: ")) {
                updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, "PRE_DOCKER_RUN_ERROR: " + buffer.substring("PRE_DOCKER_ERROR: ".length)] }));
            } else if (buffer.startsWith("LOG: ")) {
                const logLine = buffer.substring("LOG: ".length);
                updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, logLine] }));
                // Check for Streamlit URL
                const url = parseStreamlitUrl(logLine);
                if (url) {
                    updateProjectState(projectName, { streamlitUrl: url });
                }
            } else if (buffer.startsWith("LOG_ERROR: ")) {
                updateProjectState(projectName, prev => ({ scriptLogOutput: [...prev.scriptLogOutput, buffer.substring("LOG_ERROR: ".length)] }));
            } else if (buffer.startsWith("RESULT: ")) {
                // ... buffer parsing logic similar to above ...
                try {
                    const finalResult: ExecutionResultType = JSON.parse(buffer.substring("RESULT: ".length));
                    const updates: Partial<ProjectExecutionState> = {
                        finalExecutionResult: finalResult,
                        finalExecutionStatus: finalResult.overallStatus,
                        containerId: null
                    };
                    if (finalResult.scriptExecutionDuration !== undefined) updates.scriptExecutionDuration = finalResult.scriptExecutionDuration;
                    if (finalResult.mainScript && finalResult.mainScript.stdout) updates.phasedOutputs = parsePhasedOutputsFromStdout(finalResult.mainScript.stdout);

                    if (executionStatesRef.current[projectName]?.isStopRequested) {
                        updates.scriptExecutionError = "Project stopped by user.";
                        updates.finalExecutionStatus = 'stopped';
                    } else if (finalResult.overallStatus === 'failure') {
                        let errorMsg = "Script execution failed.";
                        if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                        if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
                        updates.scriptExecutionError = errorMsg;
                        playErrorSound();
                    } else if (finalResult.overallStatus === 'success') {
                        playSuccessSound();
                    }
                    updateProjectState(projectName, updates);
                } catch (e) {
                    // ... error
                    updateProjectState(projectName, {
                        scriptExecutionError: "Error parsing final result (buffer).",
                        finalExecutionStatus: 'failure',
                        finalExecutionResult: null
                    });
                    playErrorSound();
                }
            }

        } catch (err) {
            console.error("Error executing script:", err);
            const msg = err instanceof Error ? err.message : "Unknown error";
            updateProjectState(projectName, { scriptExecutionError: msg });
            playErrorSound();
        } finally {
            updateProjectState(projectName, { isExecutingScript: false, containerId: null });
        }
    }, [playErrorSound, playSuccessSound, updateProjectState, executionStates]); // Added dependencies

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
