* **Instruction:** Only use the previouly generated document as a source of truth.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.


**Pre-defined List to Use for `llm_registry`:**
```json
{
  "llm_list": [
    {
      "design_metadata": {
        "llm_id": "ollama/glm-4.6:cloud",
        "reasoner": true,
        "multimodal_support": true,
        "description": "A robust model combining strong reasoning capabilities with multimodal support. Excellent for handling complex, multi-step tasks and visual analysis. Ideal for manager agents that require a balance of performance and versatility."
      },
      "constructor_args": {
        "model": "ollama/glm-4.6:cloud",
        "timeout": 600,
        "api_key": "OLLAMA_API_KEY"
      }
    },
    {
      "design_metadata": {
        "llm_id": "gemini/gemini-2.5-flash",
        "reasoner": true,
        "multimodal_support": true,
        "description": "A high-performance, cost-effective model from Google, excellent for complex reasoning, long-context understanding, and multimodal tasks. Ideal for manager agents or agents requiring deep analysis."
      },
      "constructor_args": {
        "model": "gemini/gemini-2.5-flash",
        "timeout": 600,
        "api_key": "GEMINI_API_KEY"
      }
    },
    {
      "design_metadata": {
        "llm_id": "qwen-3-235b-a22b-instruct",
        "reasoner": false,
        "multimodal_support": false,
        "description": "A powerful non-thinking model with 235 billion parameters, excelling in instruction following, multilingual tasks, and efficient text generation at speeds exceeding 1,400 tokens per second. Ideal for worker agents handling high-volume, general-purpose tasks."
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
        "llm_id": "deepseek_chat_worker",
        "reasoner": false,
        "multimodal_support": false,
        "description": "A capable and efficient model for general-purpose tasks like writing, summarization, and data extraction. A good choice for worker agents that don't require advanced reasoning."
      },
      "constructor_args": {
        "model": "deepseek/deepseek-chat",
        "timeout": 600,
        "api_key": "DEEPSEEK_API_KEY"
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
