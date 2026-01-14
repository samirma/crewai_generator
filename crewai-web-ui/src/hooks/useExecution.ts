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

  const handleExecuteScript = async (config?: { projectName?: string }) => {
    // If config.projectName is provided, it overrides the hook's scope,
    // BUT we should probably stick to the hook's scope or update the hook to just pass through.
    // The previous API allowed handleExecuteScript({ projectName }) to switch context? 
    // Actually in the previous local hook, passing projectName just passed it to the API. The state was local.
    // Now state is named.
    // If I call handleExecuteScript({ projectName: 'foo' }) from useExecution('bar'), it would be confusing.
    // Let's assume handleExecuteScript uses the hook's projectName unless overridden (which matches old behavior somewhat).
    const target = config?.projectName || projectName;
    await globalHandleExecute(target);
  };

  const stopExecution = async () => {
    await globalStopExecution(projectName);
  };

  const resetExecutionState = () => {
    globalReset(projectName);
  };

  return {
    ...state,
    handleExecuteScript,
    stopExecution,
    resetExecutionState,
    playSuccessSound, // Expose raw functions if needed, though they are likely unused outside internal logic
    playErrorSound
  };
};
