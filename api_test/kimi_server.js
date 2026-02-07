const http = require('http');
const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '../workspace/.env') });

const KIMI_API_URL = 'https://api.kimi.com/coding/v1/messages';
const PORT = 3050;

const fs = require('fs');
const path = require('path');
const LOG_FILE = path.join(__dirname, 'server_debug.log');
const INPUT_PROMPT_FILE = path.join(__dirname, 'llm_input_prompt.txt');
const OUTPUT_PROMPT_FILE = path.join(__dirname, 'llm_output_prompt.txt');

function appendLog(data) {
    fs.appendFileSync(LOG_FILE, data + '\n');
}

// Helper to make the HTTPS request to Kimi
function callKimiApi(kimiRequest, apiKey) {
    return new Promise((resolve, reject) => {
        const url = new URL(KIMI_API_URL);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, raw: true });
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify(kimiRequest));
        req.end();
    });
}

// Transform OpenAI Request to Kimi Request
function transformRequest(openAIRequest) {
    const kimiRequest = {
        model: openAIRequest.model,
        max_tokens: openAIRequest.max_tokens || 32768,
        stream: openAIRequest.stream || false,
        messages: []
    };

    // 1. Handle Tools
    if (openAIRequest.tools && openAIRequest.tools.length > 0) {
        kimiRequest.tools = openAIRequest.tools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters
        }));
    }

    // 2. Handle Messages & System Prompt
    let systemPrompt = '';

    for (const msg of openAIRequest.messages) {
        if (msg.role === 'system') {
            systemPrompt += (systemPrompt ? '\n' : '') + msg.content;
        } else if (msg.role === 'user') {
            if (Array.isArray(msg.content)) {
                // Pass through complex content if already in Kimi format? 
                // OpenAI usually uses strings for user messages unless it's vision.
                // Kimi/Anthropic supports [{type: text, ...}, {type: image, ...}]
                // For now assume string or pass through structure if applicable.
                kimiRequest.messages.push(msg);
            } else {
                kimiRequest.messages.push({ role: 'user', content: msg.content });
            }
        } else if (msg.role === 'assistant') {
            const content = [];
            if (msg.content) {
                content.push({ type: 'text', text: msg.content });
            }
            if (msg.tool_calls) {
                for (const toolCall of msg.tool_calls) {
                    content.push({
                        type: 'tool_use',
                        id: toolCall.id,
                        name: toolCall.function.name,
                        input: JSON.parse(toolCall.function.arguments)
                    });
                }
            }
            kimiRequest.messages.push({ role: 'assistant', content });
        } else if (msg.role === 'tool') {
            // Map OpenAI 'tool' role to Kimi 'user' role with 'tool_result' content
            kimiRequest.messages.push({
                role: 'user',
                content: [{
                    type: 'tool_result',
                    tool_use_id: msg.tool_call_id,
                    content: msg.content
                }]
            });
        }
    }

    if (systemPrompt) {
        kimiRequest.system = systemPrompt;
    }

    return kimiRequest;
}

// Generate a mock system fingerprint similar to OpenAI/Cerebras format
function generateSystemFingerprint() {
    const chars = 'abcdef0123456789';
    let fp = 'fp_';
    for (let i = 0; i < 20; i++) {
        fp += chars[Math.floor(Math.random() * chars.length)];
    }
    return fp;
}

// Transform Kimi Response to OpenAI Response
function transformResponse(kimiResponse, openAIRequestModel) {

    if (kimiResponse.error) {
        return { error: kimiResponse.error };
    }

    const choices = [{
        finish_reason: 'stop',
        index: 0,
        message: {
            role: 'assistant',
            content: null, // Default
            tool_calls: []
        }
    }];

    const message = choices[0].message;
    let hasText = false;
    let hasTool = false;

    // Handle content array
    if (Array.isArray(kimiResponse.content)) {
        for (const item of kimiResponse.content) {
            if (item.type === 'text') {
                message.content = (message.content || '') + item.text;
                hasText = true;
            } else if (item.type === 'tool_use') {
                message.tool_calls.push({
                    id: item.id,
                    type: 'function',
                    function: {
                        name: item.name,
                        arguments: JSON.stringify(item.input)
                    }
                });
                hasTool = true;
            }
        }
    } else if (typeof kimiResponse.content === 'string') {
        message.content = kimiResponse.content;
        hasText = true;
    }

    // If no content, make sure it's at least a space if it's not a tool call
    // CrewAI throws an error if content is empty string ""
    if (!hasTool && (message.content === null || message.content === "")) {
        message.content = " ";
    }
    if (message.tool_calls.length === 0) {
        delete message.tool_calls;
    }

    // Map finish reason
    if (kimiResponse.stop_reason === 'tool_use') {
        choices[0].finish_reason = 'tool_calls';
    } else if (kimiResponse.stop_reason === 'end_turn') {
        choices[0].finish_reason = 'stop';
    } else {
        choices[0].finish_reason = kimiResponse.stop_reason;
    }

    const promptTokens = kimiResponse.usage?.input_tokens || 0;
    const completionTokens = kimiResponse.usage?.output_tokens || 0;
    const now = Date.now();
    const created = Math.floor(now / 1000);

    // Build OpenAI-compatible response with mocked fields to match Cerebras format
    const openAIResponse = {
        id: kimiResponse.id,
        choices: choices,
        created: created,
        model: kimiResponse.model || openAIRequestModel,
        system_fingerprint: generateSystemFingerprint(),
        object: 'chat.completion',
        usage: {
            total_tokens: promptTokens + completionTokens,
            completion_tokens: completionTokens,
            completion_tokens_details: {
                reasoning_tokens: 0
            },
            prompt_tokens: promptTokens,
            prompt_tokens_details: {
                cached_tokens: 0
            }
        },
        time_info: {
            queue_time: 0.0001,
            prompt_time: 0.001,
            completion_time: 0.01,
            total_time: 0.011,
            created: now / 1000
        }
    };

    return openAIResponse;
}

const server = http.createServer(async (req, res) => {
    // CORS wrappers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url.startsWith('/v1/chat/completions')) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const openAIRequest = JSON.parse(body);
                const apiKey = req.headers['authorization']?.replace('Bearer ', '');

                // Save input prompt to file
                fs.writeFileSync(INPUT_PROMPT_FILE, JSON.stringify(openAIRequest, null, 2));

                if (!apiKey) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: "Missing API key" } }));
                    return;
                }

                // Handle placeholder key from Next.js
                // Read the key from environment variable
                const KIMI_API_KEY = process.env.KIMI_API_KEY;
                let validApiKey = apiKey;

                if (apiKey === 'KIMI_API_KEY') {
                    console.log(`[Proxy] Substituting placeholder KIMI_API_KEY with valid key from .env.`);
                    validApiKey = KIMI_API_KEY;
                }

                // Transform
                const kimiRequest = transformRequest(openAIRequest);

                // Call Kimi
                const kimiResult = await callKimiApi(kimiRequest, validApiKey);

                if (kimiResult.status !== 200) {
                    console.error('[Proxy] Kimi API Error:', kimiResult.data);
                    res.writeHead(kimiResult.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(kimiResult.data));
                    return;
                }

                // Transform Response
                const openAIResponse = transformResponse(kimiResult.data, openAIRequest.model);
                // Save output prompt to file
                fs.writeFileSync(OUTPUT_PROMPT_FILE, JSON.stringify(openAIResponse, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(openAIResponse));

            } catch (error) {
                console.error('[Proxy] Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: error.message } }));
            }
        });
    } else {
        console.log(`[Proxy] 404 Not Found: ${req.method} ${req.url}`);
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Kimi OpenAI Wrapper running on http://localhost:${PORT}`);
});
