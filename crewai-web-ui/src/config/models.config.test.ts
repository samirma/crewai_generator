import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOllamaModels, ModelConfig } from './models.config'; // Assuming getOllamaModels is exported for testing

// Mock global fetch
global.fetch = vi.fn();

// Helper to access the internal getOllamaModels function if it's not exported
// This is a bit of a workaround. Ideally, getOllamaModels would be exported.
// For this exercise, I'll assume models.config.ts is modified to export getOllamaModels.
// If not, this test file would need to be structured differently, possibly by testing getAllModels
// and inferring getOllamaModels' behavior, or by using a more advanced mocking strategy.

describe('getOllamaModels', () => {
  beforeEach(() => {
    // Suppress console.error during tests but still check if it's called
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Ensure fetch mock is reset
    if (vi.isMockFunction(fetch)) {
      vi.mocked(fetch).mockReset();
    }
    // Restore console.error mock
    if (vi.isMockFunction(console.error)) {
      vi.mocked(console.error).mockRestore();
    }
  });

  it('should fetch and transform models correctly from Ollama API', async () => {
    const mockOllamaResponse = {
      models: [
        { name: 'llama2:latest', modified_at: '2023-10-26T13:00:00.000Z', size: 12345 },
        { name: 'mistral:7b', modified_at: '2023-10-27T14:00:00.000Z', size: 67890 },
      ],
    };
    const expectedModels: ModelConfig[] = [
      { id: 'ollama/llama2:latest', name: 'llama2:latest' },
      { id: 'ollama/mistral:7b', name: 'mistral:7b' },
    ];

    // Ensure fetch is properly typed for Vitest mocking
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOllamaResponse,
    });

    const models = await getOllamaModels();
    expect(fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    expect(models).toEqual(expectedModels);
  });

  it('should return an empty array if Ollama API returns no models', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [] }),
    });
    const models = await getOllamaModels();
    expect(models).toEqual([]);
  });

  it('should return an empty array if Ollama API response is not ok (e.g., 500)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error", // Added statusText for more realistic mock
      json: async () => ({ error: 'Server error' }),
      // text: async () => 'Server error' // response.text() is not called in the function
    });
    const models = await getOllamaModels();
    expect(models).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Failed to fetch Ollama models:", "Internal Server Error");
  });

  it('should return an empty array if fetch call throws a network error', async () => {
    const networkError = new Error('Network error');
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(networkError);
    const models = await getOllamaModels();
    expect(models).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Error fetching Ollama models:", networkError);
  });

  it('should return an empty array if Ollama API response structure is unexpected (no models array)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }), // Incorrect structure
    });
    const models = await getOllamaModels();
    expect(models).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Unexpected Ollama API response structure:", { data: [] });
  });

  it('should return an empty array if Ollama API response models is not an array', async () => {
    const malformedResponse = { models: "this should be an array" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => malformedResponse,
    });
    const models = await getOllamaModels();
    expect(models).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Unexpected Ollama API response structure:", malformedResponse);
  });
});

// Note: To run these tests, you'd typically use a command like `npx vitest` or `npm test`
// configured to run Vitest. The `models.config.ts` file would need to export `getOllamaModels`.
// For example, in models.config.ts:
// export async function getOllamaModels(): Promise<ModelConfig[]> { ... }
// (It was defined as `async function getOllamaModels()...` which makes it unexported)

// If getOllamaModels is not exported, one would have to test getAllModels and mock staticModels to isolate
// the Ollama fetching part, or temporarily modify the source file to export it for testing.
// I am proceeding with the assumption that `getOllamaModels` will be exported from `models.config.ts`.
// If it's not, the test setup would fail as `getOllamaModels` would be undefined.
// The instructions for the previous subtask did not explicitly state to export `getOllamaModels`.
// Let's assume for this subtask that it is (or will be) exported.
// If not, I would need to modify models.config.ts first.
// For now, I will add an export to getOllamaModels in models.config.ts to make these tests pass.
// This is a common practice: sometimes you need to adjust code slightly for testability.

// To make the tests pass, the `getOllamaModels` function in `crewai-web-ui/src/config/models.config.ts`
// needs to be exported. So, `async function getOllamaModels()` should be
// `export async function getOllamaModels()`. I will make this change in the next step.
