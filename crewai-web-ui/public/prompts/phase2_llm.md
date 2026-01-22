* **Instruction:** Only use the previouly generated document as a source of truth.

**Pre-defined List to Use for `llm_registry`:**
```json
{
  "llm_list": [
    {
      "design_metadata": {
        "llm_id": "ollama/minimax-m2.1:cloud",
        "reasoner": true,
        "multimodal_support": true,
        "description": "An advanced 230B parameter MoE model optimized for complex agentic workflows and multilingual programming. Features 'Interleaved Thinking' for robust multi-step reasoning and supports multimodal inputs."
      },
      "constructor_args": {
        "model": "ollama/minimax-m2.1:cloud",
        "timeout": 600,
        "api_key": "OLLAMA_API_KEY"
      }
    },
    {
      "design_metadata": {
        "llm_id": "qwen-3-235b-a22b-instruct",
        "reasoner": false,
        "multimodal_support": false,
        "description": "A high-speed, cost-efficient frontier model by Alibaba on Cerebras. Offers exceptional inference capabilities (1,500+ t/s) and large context (131K), excelling in coding, math, and general instruction following."
      },
      "constructor_args": {
        "model": "cerebras/qwen-3-235b-a22b-instruct-2507",
        "timeout": 600,
        "api_key": "CEREBRAS_API_KEY",
        "base_url": "https://api.cerebras.ai/v1"
      }
    },
    {
      "design_metadata": {
        "llm_id": "zai-glm-4.7",
        "reasoner": true,
        "multimodal_support": true,
        "description": "ZhipuAI's flagship 358B MoE model. specialized for complex reasoning with 'Interleaved Thinking', advanced coding agent capabilities, and native multimodal understanding for high-quality UI/visual outputs."
      },
      "constructor_args": {
        "model": "cerebras/zai-glm-4.7",
        "timeout": 600,
        "api_key": "CEREBRAS_API_KEY",
        "base_url": "https://api.cerebras.ai/v1"
      }
    },
    {
      "design_metadata": {
        "llm_id": "glm-4.7-flash",
        "reasoner": false,
        "multimodal_support": false,
        "description": "ZhipuAI's GLM-4.7 Flash model. High speed and low cost, suitable for high-concurrency tasks."
      },
      "constructor_args": {
        "model": "glm-4.7-flash",
        "timeout": 600,
        "api_key": "ZAI_API_KEY",
        "base_url": "https://api.z.ai/api/paas/v4"
      }
    },
    {
      "design_metadata": {
        "llm_id": "deepseek_chat_worker",
        "reasoner": false,
        "multimodal_support": false,
        "description": "A capable and efficient model for general-purpose tasks like writing, summarization, and data extraction. A good choice for worker agents that don't require advanced reasoning."
      },
      "constructor_args": {
        "model": "deepseek/deepseek-chat",
        "timeout": 600,
        "api_key": "DEEPSEEK_API_KEY",
        "max_tokens": 8000
      }
    }
  ]
}
```

JSON Schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "llm_registry": {
      "type": "array",
      "description": "A central list defining the complete set of approved LLM configurations for this crew. This list is **pre-defined** in the llm_list variable and must be populated exactly as specified.",
      "items": {
        "type": "object",
        "properties": {
          "design_metadata": {
            "type": "object",
            "description": "Contains contextual information about the LLM configuration.",
            "properties": {
              "llm_id": {
                "type": "string",
                "description": "A unique identifier for this configuration (e.g., \"gemini_pro_reasoner\", \"deepseek_chat_basic\"). This will be used to name the Python variable."
              },
              "reasoner": {
                "type": "boolean",
                "description": "`True` if the model has strong reasoning capabilities."
              },
              "multimodal_support": {
                "type": "boolean",
                "description": "`True` if the model can process images."
              },
              "description": {
                "type": "string",
                "description": "Justification for including this LLM in the registry, highlighting its key strengths for the crew."
              }
            },
            "required": ["llm_id", "reasoner", "multimodal_support", "description"]
          },
          "constructor_args": {
            "type": "object",
            "description": "Contains only the parameters for the CrewAI `LLM` class constructor.",
            "properties": {
              "model": {
                "type": "string",
                "description": "The model name string required by the provider."
              },
              "temperature": {
                "type": "number",
                "description": "The sampling temperature."
              },
              "frequency_penalty": {
                "type": "number"
              },
              "presence_penalty": {
                "type": "number"
              },
              "timeout": {
                "type": "number",
                "description": "The request timeout in seconds."
              },
              "max_tokens": {
                "type": "number",
                "description": "The maximum number of tokens for the model's response."
              },
              "api_key": {
                "type": "string",
                "description": "Environment variable name for the API key."
              }
            },
            "required": ["model"]
          }
        },
        "required": ["design_metadata", "constructor_args"]
      }
    },
    "agent_llm": {
      "type": "array",
      "description": "Each object agent from agent_cadre.",
      "items": {
        "type": "object",
        "properties": {
          "design_metadata": {
            "type": "object",
            "description": "Contains contextual information and justifications to select a model for this agent.",
            "properties": {
              "multimodal": {
                "type": "boolean",
                "description": "`True` ONLY if this agent needs to process both text and images."
              },
              "llm_rationale": {
                "type": "string",
                "description": "Justification for the chosen `llm_id` also considering the tasks task_roster assigned to this agent, in the task_roster.yaml_definition.agent . This rationale should read the `description` of the model to better decide which model to select. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability."
              },
              "yaml_id": {
                "type": "string",
                "description": "Unique yaml_id to be used to indendify this agent."
              },
              "llm_id": {
                "type": "string",
                "description": "The identifier of the LLM to be used by this agent, referencing an entry in the `llm_registry`."
              }
            },
            "required": ["multimodal", "llm_rationale", "yaml_id", "llm_id"]
          }
        },
        "required": ["design_metadata"]
      }
    }
  },
  "required": ["llm_registry", "agent_llm"]
}
```

Your entire response must be a single, valid JSON object derived from the json schema below without include the schema itself. Do not include any other text before or after the JSON.