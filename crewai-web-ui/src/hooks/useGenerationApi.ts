import { useState } from 'react';

// The hook is simplified to only manage the loading and error state of the API call.
// It no longer takes callbacks, making its behavior more predictable.
// The component calling this hook will be responsible for handling the returned data or errors.
export const useGenerationApi = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(errorData.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();
      return result; // Return the result directly
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, isLoading: isGenerating, error };
};
