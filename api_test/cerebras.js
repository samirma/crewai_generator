// Cerebras API Tool Call

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../workspace/.env') });
const { LLMClient } = require('./llm_client');

const client = new LLMClient({
  apiUrl: 'https://api.cerebras.ai/v1/chat/completions',
  apiKey: process.env.CEREBRAS_API_KEY,
  model: 'qwen-3-32b',
  logFile: path.join(__dirname, 'cerebras.log'),
  style: 'openai',
  systemPrompt: 'You are a helpful assistant. Use the provided tools to answer questions about the current time.',
  maxTokens: 20000,
  toolSet: 'cerebras'
});

const userMessage = process.argv[2] || 'What time is it in Tokyo right now?';
client.chat(userMessage).catch(console.error);
