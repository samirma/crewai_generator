// Cerebras OpenAI Client (Refactored)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../workspace/.env') });
const { LLMClientOpenAI } = require('./llm_client_openai');

const client = new LLMClientOpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1',
  model: 'qwen-3-32b',
  logFile: path.join(__dirname, 'cerebras.log'), // Keeping original log name or changing to openai_cerebras.log? Using cerebras.log to match likely intent.
  systemPrompt: 'You are a helpful assistant. Use the provided tools to answer questions about the current time.',
  toolSet: 'cerebras',
  toolHandler: (name, args) => {
    // keeping the original cerebras_openai.js logic: returns simple string
    return 'The current time is 1:45 PM.';
  }
});

const userMessage = process.argv[2] || 'What time is it in Tokyo right now?';
client.chat(userMessage).catch(console.error);
