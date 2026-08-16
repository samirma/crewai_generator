* **Instruction:** Only use the previously generated document as a source of truth.

**Pre-defined List to Use for `llm_registry`:**
```json
{
  "llm_list": [
    {
      "design_metadata": {
        "llm_id": "qwen3_8_27b_mlx",
        "reasoner": true,
        "multimodal_support": false,
        "description": "Local Qwen3.8 27B MLX model served via Ollama. PREFERRED default for all agents (the Nvidia model is currently unavailable)."
      },
      "constructor_args": {
        "model": "ollama/qwen3.8:27b-mlx",
        "timeout": 600,
        "api_key": "OLLAMA_API_KEY",
        "base_url": "http://localhost:11434"
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
                "description": "A unique identifier for this configuration (e.g., \"gemini_pro_reasoner\", \"deepseek_chat_basic\"). It becomes a Python variable name, so it MUST be a valid lowercase snake_case Python identifier: only `[a-z0-9_]`, not starting with a digit. Copy it verbatim from the llm_list."
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
                "description": "The NAME of the environment variable holding the API key (e.g., \"OLLAMA_API_KEY\") — never the key value itself."
              },
              "base_url": {
                "type": "string",
                "description": "Base URL of the API endpoint. REQUIRED for local/self-hosted models (e.g., \"http://localhost:11434\" for Ollama). Copy it verbatim from the llm_list entry."
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

Your entire response must be a single, valid JSON object conforming to the JSON Schema above (do not include the schema itself). Output raw JSON only — no markdown fences, no comments, no text before or after the JSON.