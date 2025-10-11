import { useState } from 'react';

interface UseGenerationApiProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onFinally?: () => void;
}

export const useGenerationApi = ({
  onSuccess,
  onError,
  onFinally,
}: UseGenerationApiProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const generate = async (payload: any) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      setError(err.message);
      if (onError) {
        onError(err.message);
      }
    } finally {
      setIsGenerating(false);
      if (onFinally) {
        onFinally();
      }
    }
  };

  return { generate, isLoading: isGenerating, error, data };
};