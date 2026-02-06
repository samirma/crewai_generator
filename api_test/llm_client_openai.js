const fs = require('fs');
const OpenAI = require('openai');

// Tool definitions (Shared with llm_client or duplicated, better to reuse if possible. 
// For now, I'll define the OpenAI compatible ones here or accept them in config)
const TOOLS = {
  cerebras: [{
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current time for a specific location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and country, e.g. San Francisco, USA'
          }
        },
        required: ['location']
      }
    }
  }]
};

// Default tool handler
function defaultToolHandler(name, args) {
  return 'The current time is 3:45 PM.';
}

class LLMClientOpenAI {
  constructor(config) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });
    this.model = config.model;
    this.logFile = config.logFile;
    this.systemPrompt = config.systemPrompt || '';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
    this.topP = config.topP || 0.8;
    this.tools = config.tools || TOOLS[config.toolSet] || [];
    this.toolHandler = config.toolHandler || defaultToolHandler;
  }

  appendLog(label, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      label: label,
      data: data
    };
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('Failed to write log:', e);
    }
  }

  async chat(userMessage) {

    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userMessage }
    ];

    // Request 1
    const request1 = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      top_p: this.topP,
      tools: this.tools,
      messages: messages
    };

    try {
      const completion1 = await this.client.chat.completions.create(request1);
      this.appendLog('request_1', { request: request1, response: completion1 });

      const msg1 = completion1.choices[0].message;

      // Check for tool calls
      if (!msg1.tool_calls?.length) {
        console.log(msg1.content);
        return msg1.content;
      }

      // Handle Tool Call
      const toolCall = msg1.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      //console.log(`Tool called: ${toolCall.function.name}(${JSON.stringify(args)})`);
      //console.log('Returning fixed response...\n');

      const toolResult = await this.toolHandler(toolCall.function.name, args);

      // Push history
      messages.push(msg1);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResult
      });

      // Request 2
      const request2 = {
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        top_p: this.topP,
        tools: this.tools,
        messages: messages
      };

      const completion2 = await this.client.chat.completions.create(request2);
      this.appendLog('request_2', { request: request2, response: completion2 });

      const finalContent = completion2.choices[0].message.content;
      console.log(finalContent);
      return finalContent;

    } catch (error) {
      console.error('Error in chat loop:', error);
      throw error;
    }
  }
}

module.exports = { LLMClientOpenAI, TOOLS };
