
* **Instruction:** Use the 'High-Level Architecture Plan' as the source of truth. Do not introduce new agents or tasks.
* **Objective:** Your task is to elaborate on the high-level architecture plan by providing detailed definitions for each agent and task.
* **Output Structure:** The output should be a JSON object with two keys: `agent_cadre` and `task_roster`.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.


---

**'Detailed-Architecture-Plan' - JSON Schema:**

*   `llm_registry` (Array of Objects): A central list defining the complete set of approved LLM configurations for this crew. This list is **pre-defined** and must be populated exactly as specified. Each object separates metadata from instantiation parameters.
    *   `design_metadata` (Object): Contains contextual information about the LLM configuration.
        *   `llm_id` (String): A unique identifier for this configuration (e.g., "gemini_pro_reasoner", "deepseek_chat_basic"). This will be used to name the Python variable.
        *   `reasoner` (Boolean): `True` if the model has strong reasoning capabilities.
        *   `multimodal_support` (Boolean): `True` if the model can process images.
        *   `rationale` (String): Justification for including this LLM in the registry, highlighting its key strengths for the crew.
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
      "rationale": "A high-performance, cost-effective model from Google, excellent for complex reasoning, long-context understanding, and multimodal tasks. Ideal for manager agents or agents requiring deep analysis."
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
      "rationale": "A powerful non-thinking model with 235 billion parameters, excelling in instruction following, multilingual tasks, and efficient text generation at speeds exceeding 1,400 tokens per second. Ideal for worker agents handling high-volume, general-purpose tasks."
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
      "rationale": "A capable and efficient model for general-purpose tasks like writing, summarization, and data extraction. A good choice for worker agents that don't require advanced reasoning."
    },
    "constructor_args": {
      "model": "deepseek/deepseek-chat",
      "timeout": 600,
      "api_key": "DEEPSEEK_API_KEY"
    }
  }
]
```

*   `agent_cadre` (Array of Objects): Each object represents an agent, extending the high-level definition.
    *   `design_metadata` (Object): Contains contextual information and justifications, not used for code generation.
        *   `multimodal` (Boolean): `True` ONLY if this agent needs to process both text and images.
        *   `llm_rationale` (String): Justification for the chosen `llm_id`. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability.
        *   `delegation_rationale` (String): Justification for the `allow_delegation` setting.
    *   `yaml_definition` (Object): Contains only the parameters for config/agents.yaml file.
        *   `role` (String): From the high-level plan.
        *   `goal` (String): From the high-level plan.
        *   `backstory` (String): A narrative that reinforces the agent's expertise and persona, giving it context and personality. This should align with its role and goal.
        *   `yaml_id` (String): Unique yaml_id to be used to indendify this agent.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `Agent` class constructor.
        *   `llm_id` (String): The identifier of the LLM to be used by this agent, referencing an entry in the `llm_registry`.
        *   `allow_delegation` (Boolean): `True` or `False`.

*   `task_roster` (Array of Objects): Each object represents a task, extending the high-level definition.
    *   `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        *   `task_identifier` (String): From the high-level plan.
        *   `quality_gate` (String): A high-level, human-readable statement of the success criteria for this task.
        *   `output_rationale` (String, Optional): Justification for using a for the output.
    *   `yaml_definition` (Object): Contains only the parameters for config/tasks.yaml file.
        *   `description` (String): Detailed operational prompt for the agent, derived from 'Blueprint's Execution Outline'.
        *   `expected_output` (String): **CRITICAL RULE:** This must be a precise description of the **final artifact and its state** that proves the task was successfully completed.
        *   `agent` (String): The `yaml_id` of the designated agent.
        *   `yaml_id` (String): Unique yaml_id to be used to indendify this task.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `Task` class constructor.
        *   `context` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
