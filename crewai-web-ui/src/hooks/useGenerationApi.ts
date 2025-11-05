// Define the return type for the generate function for clarity
type GenerateApiResponse = {
  isSuccess: boolean;
  result: any | null;       // 'any' to match the successful JSON payload
  errorMessage: string | null;
};

// This hook is stateless and returns a structured response object
// instead of throwing errors.
export const useGenerationApi = () => {
  
  // The function is now typed to return a Promise of GenerateApiResponse
  const generate = async (payload: any): Promise<GenerateApiResponse> => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // API returned an error (e.g., 4xx, 5xx)
        return {
          isSuccess: false,
          result: null,
          errorMessage: result.error || `API request failed with status ${response.status}`,
        };
      }

      // API call was successful
      return {
        isSuccess: true,
        result: result, // 'result' is the successful JSON payload
        errorMessage: null,
      };

    } catch (err: any) {
      // Catch network errors or JSON parsing errors
      return {
        isSuccess: false,
        result: null,
        errorMessage: err.message || "A network or parsing error occurred.",
      };
    }
  };

  return { generate };
};