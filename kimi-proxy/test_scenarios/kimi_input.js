// Kimi API Call with Tool Support

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../workspace/.env') });
const { LLMClient } = require('./llm_client');

const client = new LLMClient({
  apiUrl: 'https://api.kimi.com/coding/v1/messages',
  apiKey: process.env.KIMI_API_KEY,
  model: 'kimi-for-coding',
  logFile: path.join(__dirname, 'kimi.log'),
  style: 'anthropic',
  systemPrompt: '',
  maxTokens: 32768,
  toolSet: 'kimi'
});

const promptPath = path.join(__dirname, 'llm_input_prompt.txt');
const userMessage = fs.readFileSync(promptPath, 'utf8');
client.chat(userMessage).catch(console.error);
