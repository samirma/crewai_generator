// LLM Client - Common module for calling LLM APIs with tool support
// Supports both OpenAI-style and Anthropic-style APIs

const fs = require('fs');
const path = require('path');

// Tool definitions
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
  }],
  kimi: [{
    name: 'get_current_time',
    description: 'Get the current time for a specific location',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and country, e.g. San Francisco, USA'
        }
      },
      required: ['location']
    }
  }]
};

// Default tool handler - returns fixed string
function defaultToolHandler(name, args) {
  return 'The current time is 3:45 PM.';
}

class LLMClient {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.logFile = config.logFile;
    this.style = config.style || 'openai'; // 'openai' or 'anthropic'
    this.systemPrompt = config.systemPrompt || '';
    this.maxTokens = config.maxTokens || 4096;
    this.tools = config.tools || TOOLS[config.toolSet] || [];
    this.toolHandler = config.toolHandler || defaultToolHandler;
  }

  appendLog(label, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      label: label,
      data: data
    };
    fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
  }

  buildRequest(messages) {
    if (this.style === 'anthropic') {
      return {
        model: this.model,
        max_tokens: this.maxTokens,
        tools: this.tools,
        system: this.systemPrompt,
        messages: messages
      };
    }
    // OpenAI-style
    return {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0.7,
      top_p: 0.8,
      tools: this.tools,
      messages: this.systemPrompt ? [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ] : messages
    };
  }

  extractToolCall(response) {
    if (this.style === 'anthropic') {
      const content = response.content || [];
      const toolUse = content.find(c => c.type === 'tool_use');
      if (toolUse) {
        return {
          id: toolUse.id,
          name: toolUse.name,
          arguments: toolUse.input || {}
        };
      }
      return null;
    }
    // OpenAI-style
    const msg = response.choices?.[0]?.message;
    if (msg?.tool_calls?.length) {
      return {
        id: msg.tool_calls[0].id,
        name: msg.tool_calls[0].function.name,
        arguments: JSON.parse(msg.tool_calls[0].function.arguments)
      };
    }
    return null;
  }

  extractText(response) {
    if (this.style === 'anthropic') {
      const content = response.content || [];
      const textContent = content.find(c => c.type === 'text');
      return textContent?.text || '';
    }
    // OpenAI-style
    return response.choices?.[0]?.message?.content || '';
  }

  buildToolResultMessage(toolCall, result) {
    if (this.style === 'anthropic') {
      return {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: result
        }]
      };
    }
    // OpenAI-style
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: result
    };
  }

  buildAssistantMessage(response) {
    if (this.style === 'anthropic') {
      return {
        role: 'assistant',
        content: response.content
      };
    }
    // OpenAI-style
    return response.choices[0].message;
  }

  async sendRequest(requestBody) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    return await response.json();
  }

  async chat(userMessage) {
    //console.log('User:', userMessage);
    //console.log('---\n');

    const messages = [{ role: 'user', content: userMessage }];

    // First request
    const request1 = this.buildRequest(messages);
    const response1 = await this.sendRequest(request1);
    this.appendLog('request_1', { request: request1, response: response1 });

    // Check for tool call
    const toolCall = this.extractToolCall(response1);
    if (!toolCall) {
      console.log(this.extractText(response1));
      return;
    }

    // Execute tool
    //console.log(`Tool called: ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`);
    //console.log('Returning fixed response...\n');

    const toolResult = this.toolHandler(toolCall.name, toolCall.arguments);

    // Build conversation with tool result
    messages.push(this.buildAssistantMessage(response1));
    messages.push(this.buildToolResultMessage(toolCall, toolResult));

    // Second request
    const request2 = this.buildRequest(messages);
    const response2 = await this.sendRequest(request2);
    this.appendLog('request_2', { request: request2, response: response2 });

    console.log(this.extractText(response2));
  }
}

module.exports = { LLMClient, TOOLS };
