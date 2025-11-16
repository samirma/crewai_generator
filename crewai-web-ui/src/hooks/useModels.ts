import { useState, useEffect } from 'react';
import { getCookie } from '@/utils/cookieUtils';

export interface Model {
  id: string;
  name:string;
}

export const useModels = () => {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [modelsError, setModelsError] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("");

  useEffect(() => {
    const fetchModels = async () => {
      setModelsLoading(true);
      setModelsError("");
      try {
        const response = await fetch('/api/models');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch models: ${response.status}`);
        }
        const models: Model[] = await response.json();
        setAvailableModels(models);
        if (models.length > 0) {
          const selectableModels = models.filter(model => model.id !== 'ollama/not-configured' && model.id !== 'ollama/error');
          if (selectableModels.length > 0) {
            const newGeminiModel = selectableModels.find(model => model.id === "gemini-2.5-flash-preview-05-20");
            const llmModelCookie = getCookie('llmModelSelection');
            if (llmModelCookie && selectableModels.some(model => model.id === llmModelCookie)) {
              setLlmModel(llmModelCookie);
            } else if (newGeminiModel) {
              setLlmModel(newGeminiModel.id);
            } else {
              setLlmModel(selectableModels[0].id);
            }
          } else {
            setLlmModel("");
          }
        } else {
          setLlmModel("");
        }
      } catch (err) {
        console.error("Error fetching models:", err);
        if (err instanceof Error) {
          setModelsError(err.message);
        } else {
          setModelsError("An unknown error occurred while fetching models.");
        }
      } finally {
        setModelsLoading(false);
      }
    };
    fetchModels();
  }, []);

  return {
    availableModels,
    modelsLoading,
    modelsError,
    llmModel,
    setLlmModel,
  };
};
