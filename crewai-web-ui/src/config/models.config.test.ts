import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOllamaModels, ModelConfig } from './models.config';

// Mock global fetch
global.fetch = vi.fn();

describe('getOllamaModels', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (vi.isMockFunction(fetch)) {
      vi.mocked(fetch).mockReset();
    }
    if (vi.isMockFunction(console.error)) {
      vi.mocked(console.error).mockRestore();
    }
    vi.unstubAllEnvs(); // Clean up environment variable stubs
  });

  it('should use default URL and transform models correctly when OLLAMA_API_BASE_URL is not set', async () => {
    // OLLAMA_API_BASE_URL is unset here due to unstubAllEnvs() in afterEach
    const mockOllamaResponse = {
      models: [
        { name: 'llama2:latest', modified_at: '2023-10-26T13:00:00.000Z', size: 12345 },
        { name: 'mistral:7b', modified_at: '2023-10-27T14:00:00.000Z', size: 67890 },
      ],
    };
    const expectedModels: ModelConfig[] = [
      { id: 'ollama/llama2:latest', name: 'llama2:latest', maxOutputTokens: 65536 },
      { id: 'ollama/mistral:7b', name: 'mistral:7b' },
    ];

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOllamaResponse,
    });

    const models = await getOllamaModels();
    expect(fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    expect(models).toEqual(expectedModels);
  });

  it('should use OLLAMA_API_BASE_URL when set', async () => {
    const customUrl = 'http://custom.host:1234';
    vi.stubEnv('OLLAMA_API_BASE_URL', customUrl);

    const mockOllamaResponse = {
      models: [{ name: 'custom_model:latest', modified_at: '...', size: 0 }],
    };
    const expectedModels: ModelConfig[] = [
      { id: 'ollama/custom_model:latest', name: 'custom_model:latest' },
    ];

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOllamaResponse,
    });

    const models = await getOllamaModels();
    expect(fetch).toHaveBeenCalledWith(`${customUrl}/api/tags`);
    expect(models).toEqual(expectedModels);
  });

  it('should handle trailing slash in OLLAMA_API_BASE_URL', async () => {
    const customUrlWithSlash = 'http://custom.slash.host:5678/';
    const expectedUrlWithoutSlash = 'http://custom.slash.host:5678'; // The implementation removes the trailing slash
    vi.stubEnv('OLLAMA_API_BASE_URL', customUrlWithSlash);

    const mockOllamaResponse = {
      models: [{ name: 'slash_model:latest', modified_at: '...', size: 0 }],
    };
    const expectedModels: ModelConfig[] = [
      { id: 'ollama/slash_model:latest', name: 'slash_model:latest' },
    ];

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOllamaResponse,
    });

    const models = await getOllamaModels();
    expect(fetch).toHaveBeenCalledWith(`${expectedUrlWithoutSlash}/api/tags`);
    expect(models).toEqual(expectedModels);
  });


  it('should return an empty array if Ollama API returns no models (using default URL)', async () => {
    // OLLAMA_API_BASE_URL is unset
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [] }),
    });
    const models = await getOllamaModels();
    expect(fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    expect(models).toEqual([]);
  });

  it('should return an empty array if Ollama API response is not ok (using default URL)', async () => {
    // OLLAMA_API_BASE_URL is unset
    const defaultUrl = 'http://localhost:11434/api/tags';
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: 'Server error' }),
    });
    const models = await getOllamaModels();
    expect(fetch).toHaveBeenCalledWith(defaultUrl);
    expect(models).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Failed to fetch Ollama models:", "Internal Server Error", `(URL: ${defaultUrl})`);
  });

  it('should return an empty array if fetch call throws a network error (using default URL)', async () => {
    // OLLAMA_API_BASE_URL is unset
    const defaultUrl = 'http://localhost:11434/api/tags';
    const networkError = new Error('Network error');
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(networkError);
    const models = await getOllamaModels();
    // fetch promise is rejected, so it won't be called with specific URL in the same way for a successful call's assertion.
    // However, the function under test *will* call fetch with this URL.
    // The assertion on console.error will show the URL it attempted.
    expect(models).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Error fetching Ollama models:", networkError, `(Attempted URL: ${defaultUrl})`);
  });

  it('should return an empty array if API response structure is unexpected (no models array, using default URL)', async () => {
    // OLLAMA_API_BASE_URL is unset
    const defaultUrl = 'http://localhost:11434/api/tags';
    const incorrectResponse = { data: [] }; // Incorrect structure
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => incorrectResponse,
    });
    const models = await getOllamaModels();
    expect(fetch).toHaveBeenCalledWith(defaultUrl);
    expect(models).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Unexpected Ollama API response structure:", incorrectResponse, `(URL: ${defaultUrl})`);
  });

  it('should return an empty array if API response models is not an array (using default URL)', async () => {
    // OLLAMA_API_BASE_URL is unset
    const defaultUrl = 'http://localhost:11434/api/tags';
    const malformedResponse = { models: "this should be an array" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => malformedResponse,
    });
    const models = await getOllamaModels();
    expect(fetch).toHaveBeenCalledWith(defaultUrl);
    expect(models).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Unexpected Ollama API response structure:", malformedResponse, `(URL: ${defaultUrl})`);
  });
});
