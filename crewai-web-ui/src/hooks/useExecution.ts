import { useState, useEffect } from 'react';
import { useExecutionContext } from '@/context/ExecutionContext';

export const useExecution = (projectName: string = 'default') => {
  const {
    getProjectState,
    handleExecuteScript: globalHandleExecute,
    stopExecution: globalStopExecution,
    resetExecutionState: globalReset,
    playSuccessSound,
    playErrorSound
  } = useExecutionContext();

  const state = getProjectState(projectName);
  const [isStreamlit, setIsStreamlit] = useState(false);

  useEffect(() => {
    if (!state.isExecutingScript) {
      setIsStreamlit(false);
    }
  }, [state.isExecutingScript]);

  const handleExecuteScript = async (config?: { projectName?: string, scriptName?: string }) => {
    const target = config?.projectName || projectName;
    await globalHandleExecute(target, config?.scriptName);
  };

  const handleExecuteStreamlit = async () => {
    setIsStreamlit(true);
    await handleExecuteScript({ scriptName: 'run_streamlit.sh' });
  };

  const stopExecution = async () => {
    await globalStopExecution(projectName);
  };

  const resetExecutionState = () => {
    globalReset(projectName);
  };

  return {
    ...state,
    isExecutingScript: state.isExecutingScript && !isStreamlit,
    isExecutingStreamlit: state.isExecutingScript && isStreamlit,
    handleExecuteScript,
    handleExecuteStreamlit,
    stopExecution,
    resetExecutionState,
    playSuccessSound,
    playErrorSound,
    streamlitUrl: state.streamlitUrl
  };
};
