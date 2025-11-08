* **Instruction:** Only use the previouly generated document as a source of truth.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.

---

**JSON Schema:**

*   `llm_registry` (Array of Objects): A central list defining the complete set of approved LLM configurations for this crew. This list is **pre-defined** and must be populated exactly as specified. Each object separates metadata from instantiation parameters.
    *   `design_metadata` (Object): Contains contextual information about the LLM configuration.
        *   `llm_id` (String): A unique identifier for this configuration (e.g., "gemini_pro_reasoner", "deepseek_chat_basic"). This will be used to name the Python variable.
        *   `reasoner` (Boolean): `True` if the model has strong reasoning capabilities.
        *   `multimodal_support` (Boolean): `True` if the model can process images.
        *   `description` (String): Justification for including this LLM in the registry, highlighting its key strengths for the crew.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `LLM` class constructor.
        *   `model` (String): The model name string required by the provider.
        *   `temperature` (Number): The sampling temperature.
        *   `frequency_penalty` (Number)
        *   `presence_penalty` (Number)
        *   `timeout` (Number): The request timeout in seconds.
        *   `max_tokens` (Number): The maximum number of tokens for the model's response.
        *   `api_key` (String, Optional): Environment variable name for the API key.
    *   **Pre-defined List to Use:**
```json
[
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
```

*   `agent_llm` (Array of Objects): Each object agent from agent_cadre.
    *   `design_metadata` (Object): Contains contextual information and justifications to select a model for this agent.
        *   `multimodal` (Boolean): `True` ONLY if this agent needs to process both text and images.
        *   `llm_rationale` (String): Justification for the chosen `llm_id` also considering the tasks task_roster assigned to this agent, in the task_roster.yaml_definition.agent . This rationale should read the `description` of the model to better decide which model to select. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability.
        *   `yaml_id` (String): Unique yaml_id to be used to indendify this agent.
        *   `llm_id` (String): The identifier of the LLM to be used by this agent, referencing an entry in the `llm_registry`.