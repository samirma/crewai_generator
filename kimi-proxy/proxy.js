/**
 * Kimi OpenAI Proxy Server
 * 
 * A proxy server that translates between OpenAI-compatible API format
 * and Kimi API format. Supports streaming and non-streaming requests.
 * 
 * Entry point - all business logic is modularized in lib/
 */

require('dotenv').config({ path: require('path').join(__dirname, '../workspace/.env') });

const http = require('http');
const { PORT } = require('./lib/config');
const { setCorsHeaders, handleOptions } = require('./lib/middleware');
const { handleModels, handleChatCompletions, handleNotFound } = require('./lib/handlers');

/**
 * Main HTTP server
 */
const server = http.createServer(async (req, res) => {
    // Set CORS headers for all responses
    setCorsHeaders(res);

    // Handle preflight OPTIONS requests
    if (handleOptions(req, res)) return;

    // Handle GET /v1/models
    if (await handleModels(req, res)) return;

    // Handle POST /v1/chat/completions
    if (await handleChatCompletions(req, res)) return;

    // Handle 404 for unmatched routes
    handleNotFound(req, res);
});

server.listen(PORT, () => {
    console.log(`Kimi OpenAI Wrapper running on http://localhost:${PORT}`);
});
