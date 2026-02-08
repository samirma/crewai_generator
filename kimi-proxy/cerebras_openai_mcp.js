const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../workspace/.env') });
const { LLMClientOpenAI } = require('./llm_client_openai');
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function main() {
  // 1. Initialize MCP Client
  const transportation = new StdioClientTransport({
    command: "python", // From config.json: mcp-search-crawl -> command: python
    args: [path.join(__dirname, '../workspace/mcp/mcp_search_crawl.py')] // args: ./mcp_search_crawl.py (relative to workspace/mcp)
  });

  const mcpClient = new Client({
    name: "cerebras-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  console.log("Connecting to MCP server...");
  await mcpClient.connect(transportation);
  console.log("Connected to MCP server.");

  // 2. Fetch Tools
  const toolsResult = await mcpClient.listTools();
  const mcpTools = toolsResult.tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  }));

  console.log(`Loaded ${mcpTools.length} tools from MCP server.`);

  // 3. Initialize LLM Client
  const llmClient = new LLMClientOpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1',
    model: 'qwen-3-32b',
    logFile: path.join(__dirname, 'cerebras_mcp.log'),
    systemPrompt: 'You are a helpful assistant. Use the provided tools to retrieve real-time information when needed.',
    tools: mcpTools, // Pass dynamically fetched tools
    toolHandler: async (name, args) => {
      console.log(`[MCP] Calling tool: ${name} with args:`, args);
      try {
        const result = await mcpClient.callTool({
          name: name,
          arguments: args
        });
        console.log(`[MCP] Tool result:`, JSON.stringify(result).substring(0, 100) + '...');

        // MCP results are often { content: [{ type: 'text', text: '...' }] }
        // We need to flatten this to a string for the OpenAI format tool output
        if (result.content && Array.isArray(result.content)) {
          return result.content.map(c => c.text).join('\n');
        }
        return JSON.stringify(result);
      } catch (error) {
        console.error(`[MCP] Tool call failed:`, error);
        return `Error calling tool ${name}: ${error.message}`;
      }
    }
  });

  // 4. Chat
  const userMessage = process.argv[2] || 'What is the current price of Bitcoin?';
  console.log(`Question: ${userMessage}`);
  await llmClient.chat(userMessage);

  // Cleanup
  await mcpClient.close();
}

main().catch(console.error);
