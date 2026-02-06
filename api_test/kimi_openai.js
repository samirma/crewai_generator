// Kimi OpenAI Client (Refactored)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../workspace/.env') });
const { LLMClientOpenAI } = require('./llm_client_openai');

const fs = require('fs');

const client = new LLMClientOpenAI({
  apiKey: process.env.KIMI_API_KEY,
  baseURL: 'http://localhost:3050/v1', // Pointing to local generic wrapper
  model: 'kimi-for-coding',
  logFile: path.join(__dirname, 'openai.log'), // kimi_openai.js was logging to openai.log originally
  systemPrompt: '',
  toolSet: 'cerebras', // Using the same tool definition as cerebras (OpenAI compatible)
  toolHandler: (name, args) => {
    // User modified this in the previous turn to be 18:45 PM
    return 'The current time is 18:45 PM.';
  }
});

const promptPath = path.join(__dirname, 'llm_input_prompt.txt');
const userMessage = fs.readFileSync(promptPath, 'utf8');

client.chat(userMessage).catch(console.error);
