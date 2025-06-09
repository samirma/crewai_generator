## Design Crew Architecture Plan

**Input:** The complete **'Blueprint' document** (in Markdown format). No other information source should be used.

**Process:** Based *solely* on the **complete and detailed 'Blueprint'**, design the optimal CrewAI configuration. This involves developing the complete specifications for tasks, agents, and tools. Your role is exclusively architectural design.

The design process should follow a logical, top-down cascade to ensure robustness and internal consistency. Key considerations include:
* **Self-Correction:** The architecture must include agents and tasks dedicated to quality assurance and critique.
* **Multimodality:** The design must identify which **Agents** are multimodal, as per CrewAI's documentation. This is a core characteristic of the agent that will dictate its LLM and tasks.

**Output:** A **single JSON object** named `'Design-Crew-Architecture-Plan'**. This JSON object must be valid and adhere to the section order and schema defined below. **Do NOT generate any Python code.**

### **Design Section Order**

To improve the robustness of the design, the JSON object's keys MUST be in the following order:

1.  `workflow_process`
2.  `validation_and_critique_framework`
3.  `crew_memory`
4.  `agent_cadre`
5.  `structured_data_handling`
6.  `tool_repository`
7.  `custom_tool_definitions`
8.  `task_roster`

---
**'Design-Crew-Architecture-Plan' - JSON Schema:**

* `workflow_process` (Object):
    * `selected_process` (String): "Process.sequential" OR "Process.hierarchical".
    * `justification` (String): Explanation of why this process is optimal, referencing the specific steps in the Blueprint's Execution Outline.
    * `manager_llm_specification` (Object, Optional): Required if `selected_process` is "Process.hierarchical".
        * `model` (String): Model name from the "Approved LLM List".
        * `temperature` (Number): MUST BE 0.0.
        * `api_key_env_var` (String, Optional): Environment variable name for the API key.
        * `rationale` (String): Justification for this manager LLM, referencing its capabilities (e.g., 'reasoner') from the Approved LLM List.

* `validation_and_critique_framework` (Object):
    * `qa_strategy_description` (String): Describe the overall strategy for ensuring the quality and accuracy of the final output.
    * `critique_cycle_implementation` (String): Detail how critique and feedback loops are structured.
    * `final_validation_step` (String): Describe the final task that will perform a quality check against the `Blueprint`.

* `crew_memory` (Object, Optional):
    * `activation` (Boolean): `true` to enable memory.
    * `rationale` (String, Optional): Why memory is crucial for this crew.
    * `embedder_config` (Object, Optional):
        * `provider` (String): e.g., "ollama".
        * `config` (Object): e.g., `{"model": "nomic-embed-text:latest"}`.
        * `rationale` (String): Justification for the embedder choice.

* `agent_cadre` (Array of Objects): Each object represents an agent.
    * `role` (String): Concise functional title.
    * `goal` (String): A single, focused sentence describing the agent's objective.
    * `backstory` (String): A narrative reinforcing the agent's expertise.
    * `is_multimodal_agent` (Boolean): `true` if this agent needs to process both text and images. This is a primary characteristic of the Agent.
    * `llm_specification` (Object):
        * `model` (String): Model name from the "Approved LLM List".
        * `temperature` (Number): MUST BE 0.0.
        * `api_key_env_var` (String, Optional): Environment variable name.
    * `llm_rationale` (String): Justification for the chosen model. If `is_multimodal_agent` is `true`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability in relation to the agent's goal.
    * `tools` (Array of Strings): List of general tool *types/capabilities* (e.g., "Web Search", "File Writing").
    * `tool_rationale` (String): Explanation of why this toolkit is essential.
    * `allow_delegation` (Boolean): `true` or `false`.
    * `delegation_rationale` (String): Justification for the delegation setting.

* `structured_data_handling` (Object, Optional):
    * `usage` (Boolean): `true` if Pydantic models are used.
    * `rationale` (String, Optional): Explanation of how using Pydantic models enhances reliability.
    * `model_definitions` (Array of Objects, Optional):
        * `class_name` (String): Python class name.
        * `fields` (Object): Dictionary of field names to their Python types.

* `tool_repository` (Array of Objects): Each object defines a unique tool configuration.
    * `config_id` (String): A unique identifier.
    * `tool_type` (String): The CrewAI tool class or a custom tool's `class_name`.
    * `is_custom_tool` (Boolean): `true` if this is a custom tool.
    * `tool_selection_justification` (String): Why this specific tool is chosen.
    * `initialization_params` (Object, Optional): Parameters for the tool's constructor. For RAG-enabled tools, this MUST include a `config` object with `llm` and `embedder` specifications.
    * `input_data_requirements` (String): Description of expected input format.
    * `output_data_requirements` (String): Description of expected output format.

* `custom_tool_definitions` (Array of Objects, Optional): Define only if a custom tool is necessary.
    * `class_name` (String): Python class name.
    * `tool_name_attr` (String): The 'name' attribute for the tool.
    * `description_attr` (String): The 'description' attribute.
    * `args_schema_class_name` (String, Optional): Pydantic model class name for inputs.
    * `run_method_signature` (String): The method signature.
    * `run_method_logic_description` (String): Detailed text description of the `_run` method's logic.
    * `justification_for_custom_tool` (String): Explicit justification referencing the Blueprint.

* `task_roster` (Array of Objects): Each object represents a task.
    * `task_identifier` (String): Unique name.
    * `description` (String): Detailed operational prompt for the agent. For multimodal tasks, this should include placeholders for image inputs.
    * `assigned_agent_role` (String): The `role` of the designated agent.
    * `quality_gate` (String): A detailed description of the acceptance criteria for the `expected_output`.
    * `expected_output` (String): Definition of the task's output.
    * `enabling_tools` (Array of Strings): List of `config_id`s from the `tool_repository`.
    * `tool_rationale` (String): Justification for why these tools are chosen for this task.
    * `context_tasks` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
    * `output_pydantic_model` (String, Optional): The `class_name` of a Pydantic model for structured output.
    * `output_pydantic_rationale` (String, Optional): Justification for using Pydantic.

---
**Approved LLM List (For `model` property):**
* model: `gemini/gemini-2.5-flash-preview-05-20`, reasoner: false, multimodal_support: True
* model: `gemini/gemini-2.5-pro-preview-05-06`, reasoner: true, multimodal_support: True
* model: `deepseek/deepseek-chat`, reasoner: false, multimodal_support: True
* model: `deepseek/deepseek-reasoner`, reasoner: true, multimodal_support: True