## Design Crew Architecture Plan

**Input:** The complete **'Blueprint' document** (in Markdown format). No other information source should be used.

**Process:** Based *solely* on the **complete and detailed 'Blueprint'**, design the optimal CrewAI configuration. This involves developing the complete specifications for tasks, agents, and tools. Your role is exclusively architectural design.

**Output:** A **single JSON object** named `'Design-Crew-Architecture-Plan'**. This JSON object must be valid and contain all specifications required for the next phase to construct the Python script. **Do NOT generate any Python code.**

**'Design-Crew-Architecture-Plan' - JSON Schema:**

The root of the JSON object will contain the following keys:

* `workflow_process` (Object):
    * `selected_process` (String): "Process.sequential" OR "Process.hierarchical".
    * `justification` (String): Explanation of why this process is optimal for the Blueprint's Execution Outline.
    * `manager_llm_specification` (Object, Optional): Required if `selected_process` is "Process.hierarchical".
        * `model` (String): Model name from the "Approved LLM List".
        * `temperature` (Number): MUST BE 0.0.
        * `api_key_env_var` (String, Optional): Environment variable name for the API key (e.g., "GOOGLE_API_KEY").
        * `multimodal` (Boolean, Optional): `true` if the manager needs multimodal capabilities.
        * `rationale` (String): Justification for the choice of this manager LLM.

* `agent_cadre` (Array of Objects): Each object represents an agent with the following properties:
    * `role` (String): Concise functional title.
    * `goal` (String): Specific objective aligned with the Blueprint.
    * `backstory` (String): Narrative reinforcing expertise.
    * `llm_specification` (Object):
        * `model` (String): Model name from the "Approved LLM List".
        * `temperature` (Number): MUST BE 0.0.
        * `api_key_env_var` (String, Optional): Environment variable name.
        * `multimodal` (Boolean, Optional): `true` if this agent's LLM needs multimodal capabilities.
    * `llm_rationale` (String): Justification for the chosen model for this agent.
    * `tools` (Array of Strings): List of general tool *types/capabilities* (e.g., "Web Search", "File Writing").
    * `tool_rationale` (String): Explanation of why this toolkit is essential.
    * `allow_delegation` (Boolean): `true` or `false`.
    * `delegation_rationale` (String): Justification for the delegation setting.

* `tool_repository` (Array of Objects): Each object defines a unique tool configuration.
    * `config_id` (String): A unique identifier (e.g., "serper_search_main").
    * `tool_type` (String): The CrewAI tool class (e.g., "SerperDevTool") or a custom tool's `class_name`.
    * `is_custom_tool` (Boolean): `true` if this is a custom tool.
    * `tool_selection_justification` (String): Why this specific tool is chosen based on the Blueprint. If custom, explain why no standard tool suffices.
    * `initialization_params` (Object, Optional): Parameters for the tool's constructor (e.g., `{"api_key_env_var": "SERPER_API_KEY"}`). For RAG tools, this must include a `config` object with `llm` and `embedder` specifications.
    * `input_data_requirements` (String): Description of expected input format.
    * `output_data_requirements` (String): Description of expected output format.

* `custom_tool_definitions` (Array of Objects, Optional): Define only if a custom tool is necessary.
    * `class_name` (String): Python class name (e.g., "PDFTextExtractorTool").
    * `tool_name_attr` (String): The 'name' attribute for the tool.
    * `description_attr` (String): The 'description' attribute.
    * `args_schema_class_name` (String, Optional): Pydantic model class name for inputs.
    * `run_method_signature` (String): The method signature (e.g., "def _run(self, file_path: str) -> str:").
    * `run_method_logic_description` (String): Detailed text description of the `_run` method's logic and required libraries.
    * `justification_for_custom_tool` (String): Explicit justification referencing the Blueprint.

* `task_roster` (Array of Objects): Each object represents a task.
    * `task_identifier` (String): Unique name (e.g., "pdf_extraction_task").
    * `description` (String): Detailed operational prompt for the agent.
    * `assigned_agent_role` (String): The `role` of the designated agent.
    * `expected_output` (String): Definition of the task's output. If it's a deliverable, specify the filename.
    * `enabling_tools` (Array of Strings): List of `config_id`s from the `tool_repository`.
    * `tool_rationale` (String): Justification for why these specific tools are chosen for this task.
    * `context_tasks` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
    * `output_pydantic_model` (String, Optional): The `class_name` of a Pydantic model for structured output.
    * `output_pydantic_rationale` (String, Optional): Justification for using Pydantic.

* `structured_data_handling` (Object, Optional):
    * `usage` (Boolean): `true` if Pydantic models are used.
    * `rationale` (String, Optional): Explanation of how Pydantic enhances the solution.
    * `model_definitions` (Array of Objects, Optional):
        * `class_name` (String): Python class name.
        * `fields` (Object): Dictionary of field names to their Python types (e.g., `{"report_title": "str", "score": "float"}`).

* `crew_memory` (Object, Optional):
    * `activation` (Boolean): `true` to enable memory.
    * `rationale` (String, Optional): Why memory is crucial.
    * `embedder_config` (Object, Optional):
        * `provider` (String): e.g., "ollama".
        * `config` (Object): e.g., `{"model": "nomic-embed-text:latest"}`.
        * `rationale` (String): Justification for the embedder choice.

---
**Approved LLM List (For `model` property):**
* `gemini/gemini-2.5-flash-preview-05-20`
* `gemini/gemini-2.5-pro-preview-05-06`
* `deepseek/deepseek-chat`