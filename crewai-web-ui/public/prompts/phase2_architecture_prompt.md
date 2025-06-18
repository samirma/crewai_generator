

Use the previous document as a blueprint to achieve the goal described there, to design the optimal CrewAI configuration in a JSON object. This involves developing the complete specifications for tasks, agents, and tools. Your role is exclusively architectural design.

The design process should follow a logical, top-down cascade to ensure robustness and internal consistency. Key considerations include:
* **Self-Correction:** The architecture must include agents and tasks dedicated to quality assurance and critique.
* **Clarity for Code Generation:** The design must clearly separate parameters intended for Python class constructors (`constructor_args`) from the contextual justification for those parameters (`design_metadata`).
* **Output Format:** You ONLY output will be this json object.

### **Design Section Order**

To improve the robustness of the design, the JSON object's keys MUST be in the following order:

1.  `workflow_process`
2.  `crew_memory`
3.  `llm_registry`
4.  `agent_cadre`
5.  `structured_data_handling`
6.  `tool_repository`
7.  `custom_tool_definitions`
8.  `task_roster`

### **Canonical Tool Library for Evaluation**

To ensure a realistic and grounded design, all tool selections must be made **exclusively** from the following canonical list of available tools from the `crewai_tools` libraries. The `tool_selection_justification` field within the `tool_repository` must reference this list for its evaluation.

#### `crewai_tools`

    * `SerperDevTool` (supports\_embedding: `False`)
    * `ScrapeWebsiteTool` (supports\_embedding: `False`)
    * `WebsiteSearchTool` (supports\_embedding: `True`)
    * `BrowserbaseTool` (supports\_embedding: `False`)
    * `CodeDocsSearchTool` (supports\_embedding: `True`)
    * `PDFSearchTool` (supports\_embedding: `True`)
    * `FileReadTool` (supports\_embedding: `False`)
    * `FileWriterTool` (supports\_embedding: `False`)
    * `DirectoryReadTool` (supports\_embedding: `False`)
    * `CSVSearchTool` (supports\_embedding: `True`)
    * `DOCXSearchTool` (supports\_embedding: `True`)
    * `JSONSearchTool` (supports\_embedding: `True`)
    * `MDXSearchTool` (supports\_embedding: `True`)
    * `RagTool` (supports\_embedding: `True`)
    * `TXTSearchTool` (supports\_embedding: `True`)
    * `XMLSearchTool` (supports\_embedding: `True`)
    * `CodeInterpreterTool` (supports\_embedding: `False`)
    * `GithubSearchTool` (supports\_embedding: `False`)

---

**'Design-Crew-Architecture-Plan' - JSON Schema:**

* `workflow_process` (Object):
    * `selected_process` (String): "Process.sequential" OR "Process.hierarchical".
    * `justification` (String): Explanation of why this process is optimal, referencing the specific steps in the Blueprint's Execution Outline.
    * `manager_llm_specification` (Object, Optional): Required if `selected_process` is "Process.hierarchical".
        * `llm_id` (String): The identifier for the manager's LLM, chosen from the `llm_registry`.
        * `rationale` (String): Justification for this manager LLM choice, referencing its capabilities (e.g., 'reasoner') from the `llm_registry`.

* `crew_memory` (Object, Optional):
    * `activation` (Boolean): `True` to enable memory.
    * `rationale` (String, Optional): Why memory is crucial for this crew.
    * `embedder_config` (Object, Optional): Required if `activation` is `True`.
        * `provider` (String): The name of the embedding provider (e.g., "ollama").
        * `config` (Object): Provider-specific configuration.
            * `model` (String): The model name (e.g., "nomic-embed-text:latest").
            * `base_url_env_var` (String, Optional): **Required for providers like 'ollama'.** The environment variable holding the base URL (e.g., "OLLAMA_HOST").
        * `rationale` (String): Justification for the embedder choice.

* `llm_registry` (Array of Objects): A central list defining the complete set of approved LLM configurations for this crew. This list is **pre-defined** and must be populated exactly as follows:
    * `llm_id` (String): A unique identifier for this configuration (e.g., "gemini_pro_reasoner", "deepseek_chat_basic").
    * `model` (String): The model name.
    * `reasoner` (Boolean): `True` if the model has strong reasoning capabilities.
    * `multimodal_support` (Boolean): `True` if the model can process images.
    * `temperature` (Number): MUST BE 0.0.
    * `frequency_penalty` (Number): MUST BE 0.0.
    * `presence_penalty` (Number): MUST BE 0.0.
    * `timeout` (Number): The request timeout in seconds.**
    * `max_tokens` (Number): The maximum number of tokens for the model's response.**
    * `api_key_env_var` (String, Optional): Environment variable name for the API key.
    * **Pre-defined List to Use:**
        * `gemini/gemini-2.5-flash` (reasoner: True, multimodal\_support: True, timeout: 600, max_tokens: 65536)
        * `gemini/gemini-2.5-pro` (reasoner: True, multimodal\_support: True, timeout: 600, max_tokens: 65536)
        * `deepseek/deepseek-chat` (reasoner: False, multimodal\_support: False, timeout: 600, max_tokens: 8000)
        * `deepseek/deepseek-reasoner` (reasoner: False, multimodal\_support: False, timeout: 600, max_tokens: 64000)

* `agent_cadre` (Array of Objects): Each object represents an agent. The structure separates constructor arguments from design rationale.
    * `design_metadata` (Object): Contains contextual information and justifications, not used for code generation.
        * `multimodal` (Boolean): `True` ONLY if this agent needs to process both text and images.
        * `llm_rationale` (String): Justification for the chosen `llm_id`. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability.
        * `delegation_rationale` (String): Justification for the `allow_delegation` setting.
    * `constructor_args` (Object): Contains only the parameters for the CrewAI `Agent` class constructor.
        * `role` (String): Concise functional title. This acts as the primary identifier for the agent.
        * `goal` (String): A single, focused sentence describing the agent's objective.
        * `backstory` (String): A narrative reinforcing the agent's expertise.
        * `llm_id` (String): The identifier of the LLM to be used by this agent, referencing an entry in the `llm_registry`.
        * `tools` (Array of Strings): List of `tool_id`s from the `tool_repository` that this agent will use.
        * `allow_delegation` (Boolean): `True` or `False`.

* `structured_data_handling` (Object, Optional):
    * `usage` (Boolean): `True` if Pydantic models are used.
    * `rationale` (String, Optional): Explanation of how using Pydantic models enhances reliability.
    * **CRITICAL RULE FOR LISTS:** If a task's `expected_output` is a list of structured items, you MUST define two Pydantic models: 1) A model for the single item, and 2) A "wrapper" model that contains a `typing.List` of the single item model. This wrapper model is what must be used in the `task_roster`.
    * `model_definitions` (Array of Objects, Optional):
        * `class_name` (String): Python class name.
        * `fields` (Object): Dictionary of field names to their Python types.

* `tool_repository` (Array of Objects): Each object defines a unique tool to be instantiated, separating design rationale from instantiation parameters.
    * `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        * `required_functionality` (String): A clear, one-sentence description of the specific action the tool must perform.
        * `crewai_tool_evaluation` (Array of Objects): An evaluation of relevant crewai tools.
            * `tool_selection_justification` (String): Review the **Canonical Tool Library** provided above to identify the most suitable tool. Your analysis MUST explain why your chosen tool from this list is optimal and why other relevant tools from the same list are not sufficient.
            * `is_valid_availiable_tool` (Boolean): `True` or `False`.
            * `tool_name` (String): The exact, importable CrewAI tool class. **Crucially, this name must match the latest library version.**
        * `is_custom_tool` (Boolean): `True` if no available tool is sufficient, derived from the analysis.
        * `is_custom_embedding_supported` (Boolean): `True` if this selected tool supports embedding, e.g (PDFSearchTool, TXTSearchTool and RagTool, etc)
        * `tool_llm_specification` (Object, Optional): **Required if `is_custom_embedding_supported` is `True` and `crew_memory.activation` is `True`.**
            * `llm_id` (String): The identifier for the tool's internal LLM, chosen from the `llm_registry`.
            * `rationale` (String): Justification for this LLM choice for the tool's internal processing (e.g., summarization).
    * `constructor_args` (Object): Contains only the parameters for the tool's class constructor.
        * `tool_id` (String): A unique identifier for this specific tool instance (e.g., "web_search_tool"). This acts as the primary identifier for the tool.
        * `class_name` (String): The exact Python class name to instantiate. **This must be a verbatim, up-to-date class name from the `crewai_tools` or `langchain_community.tools` library.**
        * `initialization_params` (Object, Optional): Constructor parameters for the tool.
            **CRITICAL RULE for Embedding-Supported Tools:** If `design_metadata.is_custom_embedding_supported` is `True` and `crew_memory.activation` is `True`, this object MUST contain a `config` key. The `config` object must be structured with two keys: `llm` and `embedder`.
                - The `llm` object must be built using the details from the `llm_registry` entry matching `design_metadata.tool_llm_specification.llm_id`. It must have a google `provider` and model = "gemini/gemini-2.0-flash-lite" and a `config` sub-object containing `model`, `temperature`, and `api_key_env_var`.
                - The `embedder` object must be a direct copy of the `crew_memory.embedder_config` object.

* `custom_tool_definitions` (Array of Objects):
    * `class_definition_args` (Object):
        * `name_attribute` (String)
        * `description_attribute` (String)
        * `args_pydantic_model` (String): **(Now Mandatory if arguments exist)** The class name for the Pydantic arguments model (e.g., "PDFDownloaderToolArgs").
        * `run_method_parameters` (Array of Objects): **(Newly Added Field)** Defines the parameters for the `_run` method.
            * `name` (String): The parameter's name (e.g., "url").
            * `python_type` (String): The parameter's Python type hint (e.g., "str").
            * `description` (String): A description for the Pydantic `Field`.
        * `run_method_logic` (String)

* `task_roster` (Array of Objects): Each object represents a task, separating design rationale from instantiation parameters.
    * `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        * `task_identifier` (String): A unique name for the task, used for context linking.
        * `quality_gate` (String): A detailed description of the acceptance criteria for the `expected_output`.
        * `tool_rationale` (String, Optional): Justification for why specific tools are chosen for this task.
        * `output_pydantic_rationale` (String, Optional): Justification for using a Pydantic model for the output.
    * `constructor_args` (Object): Contains only the parameters for the CrewAI `Task` class constructor.
        * `description` (String): Detailed operational prompt for the agent. For multimodal tasks, this should include placeholders for image inputs.
        * `agent` (String): The `role` of the designated agent.
        * `expected_output` (String): Definition of the task's output artifact.
        * `tools` (Array of Strings, Optional): List of `tool_id`s from the `tool_repository`.
        * `context` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
        * `output_pydantic` (String, Optional): The `class_name` of a Pydantic model for structured output.

