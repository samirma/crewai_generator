import { getAllModels, getModelConfig, localServerConfigs } from '../models.config';

// Mock global fetch
global.fetch = jest.fn();

describe('getAllModels', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        // Reset localServerConfigs if we were modifying it, but here we just read it.
        // If we wanted to test adding servers, we might need to modify the exported array,
        // but for now we test with the default one and maybe mock different responses.
    });

    it('should fetch models from all configured sources', async () => {
        // Mock Ollama response
        (global.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url.includes('11434')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        models: [{ name: 'llama2' }]
                    })
                });
            }
            if (url.includes('8080')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: [{ id: 'gpt-4-local' }]
                    })
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const models = await getAllModels();

        // Check static models (we just check one existence)
        expect(models).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'gemini-2.5-flash' })
        ]));

        // Check Ollama
        expect(models).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'llama2', name: '(Ollama) llama2' })
        ]));

        // Check Local
        expect(models).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'local_gpt-4-local', name: '(Local) gpt-4-local' })
        ]));
    });

    it('should handle local server failure gracefully', async () => {
        // Mock Ollama success, Local failure
        (global.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url.includes('11434')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        models: [{ name: 'llama2' }]
                    })
                });
            }
            if (url.includes('8080')) {
                return Promise.reject(new Error('Connection refused'));
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const models = await getAllModels();

        // Should still have static and Ollama
        expect(models).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'gemini-2.5-flash' })
        ]));
        expect(models).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'llama2' })
        ]));

        // Should NOT have local
        const localModel = models.find(m => m.id.includes('local_'));
        expect(localModel).toBeUndefined();
    });

    it('should handle extra configured servers', async () => {
        // Temporarily add a server
        localServerConfigs.push({
            id: 'vllm',
            name: 'vLLM',
            baseURL: 'http://localhost:8000/v1'
        });

        (global.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url.includes('11434')) return Promise.resolve({ ok: false }); // Ollama fail
            if (url.includes('8080')) return Promise.resolve({ ok: false }); // Local fail
            if (url.includes('8000')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: [{ id: 'opt-125m' }]
                    })
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const models = await getAllModels();

        expect(models).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'vllm_opt-125m', name: '(vLLM) opt-125m' })
        ]));

        // Cleanup
        localServerConfigs.pop();
    });
});

describe('getModelConfig', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    it('should resolve static model config without network', async () => {
        const config = await getModelConfig('gemini-2.5-flash');
        expect(config).toBeDefined();
        expect(config?.baseURL).toBe('https://generativelanguage.googleapis.com/v1beta');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should resolve local server model config from prefix', async () => {
        const config = await getModelConfig('local_gpt-4-local');
        expect(config).toBeDefined();
        expect(config?.baseURL).toBe('http://localhost:8080/v1');
        expect(config?.model).toBe('gpt-4-local');
        expect(config?.name).toContain('(Local)');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should resolve ml-studio model config from prefix', async () => {
        const config = await getModelConfig('ml-studio_llama3');
        expect(config).toBeDefined();
        expect(config?.baseURL).toBe('http://localhost:1234/v1');
        expect(config?.model).toBe('llama3');
        expect(config?.name).toContain('(ML Studio)');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fallback to Ollama config for unknown IDs', async () => {
        const config = await getModelConfig('llama3');
        expect(config).toBeDefined();
        expect(config?.baseURL).toBe('http://localhost:11434/v1');
        expect(config?.model).toBe('llama3');
        expect(config?.name).toContain('(Ollama)');
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
