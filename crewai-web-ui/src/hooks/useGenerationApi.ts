import { useState } from 'react';

// This hook now throws an error on failure, which must be caught by the calling component.
// This makes the error handling more explicit and robust.
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
        // The calling function will now be responsible for catching this error.
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      // Re-throw the error to be caught by the calling function (e.g., in usePhases).
      setError(err.message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, isLoading: isGenerating, error };
};
