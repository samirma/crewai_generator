import { useState, useRef } from 'react';
import type { ExecutionResult as ExecutionResultType } from '../app/api/execute/types';
import { parsePhasedOutputsFromStdout } from '@/utils/outputParser';

export interface PhasedOutput {
  taskName: string;
  output: string;
}

export const useExecution = () => {
  const [isExecutingScript, setIsExecutingScript] = useState<boolean>(false);
  const [scriptExecutionError, setScriptExecutionError] = useState<string>("");
  const [scriptLogOutput, setScriptLogOutput] = useState<string[]>([]);
  const [dockerCommandToDisplay, setDockerCommandToDisplay] = useState<string>("");
  const [phasedOutputs, setPhasedOutputs] = useState<PhasedOutput[]>([]); // For simple mode's task outputs
  const [scriptExecutionDuration, setScriptExecutionDuration] = useState<number | null>(null);
  const [hasExecutionAttempted, setHasExecutionAttempted] = useState<boolean>(false);
  const [scriptTimerKey, setScriptTimerKey] = useState<number>(0);
  const [finalExecutionStatus, setFinalExecutionStatus] = useState<string | null>(null);
  const [finalExecutionResult, setFinalExecutionResult] = useState<ExecutionResultType | null>(null);
  const scriptSuccessSoundRef = useRef<HTMLAudioElement | null>(null);
  const scriptErrorSoundRef = useRef<HTMLAudioElement | null>(null);

  const playSuccessSound = () => {
    scriptSuccessSoundRef.current?.play().catch(e => console.error("Error playing success sound:", e));
  };

  const playErrorSound = () => {
    scriptErrorSoundRef.current?.play().catch(e => console.error("Error playing error sound:", e));
  };

  const handleExecuteScript = async () => {
    setHasExecutionAttempted(true);
    setIsExecutingScript(true);
    setScriptTimerKey(prevKey => prevKey + 1);
    setScriptExecutionError("");
    setScriptLogOutput([]);
    setDockerCommandToDisplay("");
    setPhasedOutputs([]);
    setScriptExecutionDuration(null);
    setFinalExecutionStatus(null);
    setFinalExecutionResult(null);

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        let errorText = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch {}
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
          setScriptExecutionError("Error reading script output stream. Connection may have been lost or the process terminated unexpectedly.");
          setScriptLogOutput(prev => [...prev, "STREAM_ERROR: The log stream ended unexpectedly due to a read error."]);
          break;
        }
        if (done) break;
        try {
          buffer += decoder.decode(value, { stream: true });
        } catch (decodeError) {
          console.error("Error decoding stream data:", decodeError);
          setScriptExecutionError("Error decoding script output. The data may be corrupted.");
          setScriptLogOutput(prev => [...prev, "STREAM_ERROR: The log stream contained undecodable data."]);
          break;
        }
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("DOCKER_COMMAND: ")) {
            setDockerCommandToDisplay(line.substring("DOCKER_COMMAND: ".length));
          } else if (line.startsWith("PRE_DOCKER_LOG: ")) {
            setScriptLogOutput(prev => [...prev, "PRE_DOCKER_RUN: " + line.substring("PRE_DOCKER_LOG: ".length)]);
          } else if (line.startsWith("PRE_DOCKER_ERROR: ")) {
            setScriptLogOutput(prev => [...prev, "PRE_DOCKER_RUN_ERROR: " + line.substring("PRE_DOCKER_ERROR: ".length)]);
          } else if (line.startsWith("LOG: ")) {
            setScriptLogOutput(prev => [...prev, line.substring("LOG: ".length)]);
          } else if (line.startsWith("LOG_ERROR: ")) {
            setScriptLogOutput(prev => [...prev, line.substring("LOG_ERROR: ".length)]);
          } else if (line.startsWith("RESULT: ")) {
            try {
              const finalResult: ExecutionResultType = JSON.parse(line.substring("RESULT: ".length));
              setFinalExecutionResult(finalResult);
              setFinalExecutionStatus(finalResult.overallStatus);
              if (finalResult.scriptExecutionDuration !== undefined) {
                setScriptExecutionDuration(finalResult.scriptExecutionDuration);
              } else {
                setScriptExecutionDuration(null);
              }
              if (finalResult.mainScript && finalResult.mainScript.stdout) {
                const taskOutputs = parsePhasedOutputsFromStdout(finalResult.mainScript.stdout);
                setPhasedOutputs(taskOutputs);
              }
              if (finalResult.overallStatus === 'failure') {
                let errorMsg = "Script execution failed.";
                if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
                if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
                setScriptExecutionError(errorMsg);
                playErrorSound();
              } else if (finalResult.overallStatus === 'success') {
                playSuccessSound();
              }
            } catch (e) {
              console.error("Error parsing final result JSON:", e);
              setScriptExecutionError("Error parsing final result from script execution.");
              setFinalExecutionStatus('failure');
              setFinalExecutionResult(null);
              setScriptExecutionDuration(null);
              playErrorSound();
            }
          }
        }
      }
      if (buffer.startsWith("DOCKER_COMMAND: ")) {
        setDockerCommandToDisplay(buffer.substring("DOCKER_COMMAND: ".length));
      } else if (buffer.startsWith("PRE_DOCKER_LOG: ")) {
        setScriptLogOutput(prev => [...prev, "PRE_DOCKER_RUN: " + buffer.substring("PRE_DOCKER_LOG: ".length)]);
      } else if (buffer.startsWith("PRE_DOCKER_ERROR: ")) {
        setScriptLogOutput(prev => [...prev, "PRE_DOCKER_RUN_ERROR: " + buffer.substring("PRE_DOCKER_ERROR: ".length)]);
      } else if (buffer.startsWith("LOG: ")) {
        setScriptLogOutput(prev => [...prev, buffer.substring("LOG: ".length)]);
      } else if (buffer.startsWith("LOG_ERROR: ")) {
        setScriptLogOutput(prev => [...prev, buffer.substring("LOG_ERROR: ".length)]);
      } else if (buffer.startsWith("RESULT: ")) {
        try {
          const finalResult: ExecutionResultType = JSON.parse(buffer.substring("RESULT: ".length));
          setFinalExecutionResult(finalResult);
          setFinalExecutionStatus(finalResult.overallStatus);
          if (finalResult.scriptExecutionDuration !== undefined) {
            setScriptExecutionDuration(finalResult.scriptExecutionDuration);
          } else {
            setScriptExecutionDuration(null);
          }
          if (finalResult.mainScript && finalResult.mainScript.stdout) {
            const taskOutputs = parsePhasedOutputsFromStdout(finalResult.mainScript.stdout);
            setPhasedOutputs(taskOutputs);
          }
          if (finalResult.overallStatus === 'failure') {
            let errorMsg = "Script execution failed.";
            if (finalResult.error) errorMsg += ` Error: ${finalResult.error}`;
            if (finalResult.mainScript && finalResult.mainScript.stderr) errorMsg += ` Stderr: ${finalResult.mainScript.stderr}`;
            setScriptExecutionError(errorMsg);
            playErrorSound();
          } else if (finalResult.overallStatus === 'success') {
            playSuccessSound();
          }
        } catch (e) {
          console.error("Error parsing final result JSON from remaining buffer:", e);
          setScriptExecutionError("Error parsing final result from script execution (buffer).");
          setFinalExecutionStatus('failure');
          setFinalExecutionResult(null);
          setScriptExecutionDuration(null);
          playErrorSound();
        }
      }
    } catch (err) {
      console.error("Error executing script:", err);
      if (err instanceof Error) {
        setScriptExecutionError(err.message);
      } else {
        setScriptExecutionError("An unknown error occurred while executing the script.");
      }
      playErrorSound();
    } finally {
      setIsExecutingScript(false);
    }
  };

  return {
    isExecutingScript,
    scriptExecutionError,
    scriptLogOutput,
    dockerCommandToDisplay,
    phasedOutputs,
    scriptExecutionDuration,
    hasExecutionAttempted,
    scriptTimerKey,
    finalExecutionStatus,
    finalExecutionResult,
    handleExecuteScript,
    scriptSuccessSoundRef,
    scriptErrorSoundRef,
  };
};
