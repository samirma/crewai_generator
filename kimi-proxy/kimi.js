// Kimi API Call with Tool Support

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../workspace/.env') });
const { LLMClient } = require('./llm_client');

const client = new LLMClient({
  apiUrl: 'https://api.kimi.com/coding/v1/messages',
  apiKey: process.env.KIMI_API_KEY,
  model: 'kimi-for-coding',
  logFile: path.join(__dirname, 'kimi.log'),
  style: 'anthropic',
  systemPrompt: 'You are a helpful assistant. Use the provided tools to answer questions about the current time.',
  maxTokens: 32768,
  toolSet: 'kimi'
});

const userMessage = process.argv[2] || 'What time is it in Tokyo right now?';
client.chat(userMessage).catch(console.error);
