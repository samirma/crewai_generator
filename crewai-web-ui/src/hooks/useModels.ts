import { useState, useEffect } from 'react';
import { getCookie } from '@/utils/cookieUtils';
import { useSettings } from '@/context/SettingsContext';

export interface Model {
  id: string;
  name: string;
}

export const useModels = () => {
  const { availableModels, modelsLoading, modelsError } = useSettings();
  const [llmModel, setLlmModel] = useState<string>("");

  useEffect(() => {
    if (availableModels.length > 0) {
      const selectableModels = availableModels.filter(model => model.id !== 'ollama/not-configured' && model.id !== 'ollama/error');
      if (selectableModels.length > 0) {
        const llmModelCookie = getCookie('llmModelSelection');
        if (llmModelCookie && selectableModels.some(model => model.id === llmModelCookie)) {
          setLlmModel(llmModelCookie);
        } else {
          setLlmModel(selectableModels[0].id);
        }
      } else {
        setLlmModel("");
      }
    } else {
      setLlmModel("");
    }
  }, [availableModels]);

  return {
    availableModels,
    modelsLoading,
    modelsError,
    llmModel,
    setLlmModel,
  };
};
