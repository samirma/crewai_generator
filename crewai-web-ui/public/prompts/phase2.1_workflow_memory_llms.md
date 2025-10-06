* **Instruction:** Only use the document identified as 'Project Blueprint' within `{{{ }}}` as your sole source of truth.
* **Objective:** Your task is to design the initial technical specifications for a CrewAI project, focusing on workflow, memory, and LLM configuration.
* **Output Structure:** The design must clearly separate technical parameters (`constructor_args`) from contextual justification (`design_metadata`).
* **Final Output Format:** Your entire response must be a single JSON object containing three keys: `workflow_process`, `crew_memory`, and `llm_registry`. Do not include any other text before or after the JSON.

---

**'Design-Crew-Architecture-Plan' - JSON Schema Section:**

*   `workflow_process` (Object):
    *   `rationale` (String): Justification based on the Design Blueprint detail to use CrewAI with `Process.sequential` or `Process.hierarchical`.
    *   `selected_process` (String): `Process.sequential` OR `Process.hierarchical`.

*   `crew_memory` (Object):
    *   `rationale` (String): Justification for enabling or not the support for memory in crewai.
    *   `activation` (Boolean): `True` to enable memory.
    *   `embedder_config` (Object, Optional): Required if `activation` is `True` else 'False'.
        *   `provider` (String): The name of the embedding provider (e.g., "ollama").
        *   `config` (Object): Provider-specific configuration.
            *   `model` (String): The model name (e.g., "mxbai-embed-large:latest").
            *   `base_url_env_var` (String, Optional): **Required for providers like 'ollama'.** The environment variable holding the base URL (e.g., "OLLAMA_HOST").
        *   `rationale` (String): Justification for the embedder choice.

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