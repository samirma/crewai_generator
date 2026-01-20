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
    // If config.projectName is provided, it overrides the hook's scope,
    // BUT we should probably stick to the hook's scope or update the hook to just pass through.
    // The previous API allowed handleExecuteScript({ projectName }) to switch context? 
    // Actually in the previous local hook, passing projectName just passed it to the API. The state was local.
    // Now state is named.
    // If I call handleExecuteScript({ projectName: 'foo' }) from useExecution('bar'), it would be confusing.
    // Let's assume handleExecuteScript uses the hook's projectName unless overridden (which matches old behavior somewhat).
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
    playErrorSound
  };
};
