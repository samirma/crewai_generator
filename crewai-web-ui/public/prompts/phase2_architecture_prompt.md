## Design Crew Architecture Plan

**Input:** The complete **'Blueprint' document** (in Markdown format). No other information source should be used.

**Process:** Based *solely* on the **complete and detailed 'Blueprint'**, design the optimal CrewAI configuration. This involves developing the complete specifications for tasks, agents, and tools. Your role is exclusively architectural design.

The design process should follow a logical, top-down cascade to ensure robustness and internal consistency. Key considerations include:
* **Self-Correction:** The architecture must include agents and tasks dedicated to quality assurance and critique.
* **Multimodality:** The design must identify which **Agents** are multimodal, as per CrewAI's documentation. This is a core characteristic of the agent that will dictate its LLM and tasks.

**Output:** A **single JSON object** named `'Design-Crew-Architecture-Plan'`. This JSON object must be valid and adhere to the section order and schema defined below. **Do NOT generate any Python code.**

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
    * `multimodal` (Boolean): `true` ONLY if this agent needs to process both text and images, otherwise it should be `false`. This is a primary characteristic of the Agent.
    * `llm_specification` (Object):
        * `model` (String): Model name from the "Approved LLM List".
        * `temperature` (Number): MUST BE 0.0.
        * `api_key_env_var` (String, Optional): Environment variable name.
    * `llm_rationale` (String): Justification for the chosen model. If `multimodal` is `true`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability in relation to the agent's goal.
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

* `tool_repository` (Array of Objects): Each object defines a unique tool to be instantiated.
    * `tool_id` (String): A unique identifier for this specific tool instance (e.g., "web_search_tool", "primary_file_writer").
    * `usage_justification` (String): A concise explanation of why this tool is essential for the crew's overall mission, referencing the Blueprint's goals.
    * `analysis_and_decision` (Object): A structured block to ensure rigorous tool selection.
        * `required_functionality` (String): A clear, one-sentence description of the specific action the tool must perform, derived from the Blueprint's requirements (e.g., "Read a single, specific section from a Markdown file given the section's title").
        * `standard_tool_evaluation` (Array of Objects): An evaluation of relevant standard tools.
            * `tool_name` (String): Name of a standard tool from the reference list (e.g., "FileReadTool").
            * `suitability_analysis` (String): A mandatory, explicit analysis of WHY this standard tool IS or IS NOT sufficient. Must reference the tool's exact capabilities from the 'Standard CrewAI Tool Reference'. Example: "FileReadTool is NOT sufficient because it can only read the entire file, but the requirement is to read a specific section, which it cannot do."
            * `is_sufficient` (Boolean): `true` or `false`.
        * `final_decision_rationale` (String): A concluding statement. If a standard tool is sufficient, explain why. If no standard tool is sufficient after evaluating all relevant candidates, state this clearly. This rationale directly determines the value of 'is_custom_tool'.
    * `is_custom_tool` (Boolean): MUST be `true` if the `standard_tool_evaluation` concluded that no standard tool is sufficient. Otherwise, MUST be `false`.
    * `class_name` (String): The exact Python class name to instantiate. If `is_custom_tool` is `false`, this will be a standard tool class (e.g., `SerperDevTool`). If `is_custom_tool` is `true`, this will be the name of the new custom tool class defined in `custom_tool_definitions`.
    * `initialization_params` (Object, Optional): An object where keys are the exact parameter names for the tool's constructor (`__init__`) and values are their corresponding arguments.

* `custom_tool_definitions` (Array of Objects, Optional): Defines the complete implementation details for a custom tool.
    * `tool_id` (String): The identifier that links this definition to an entry in the `tool_repository`.
    * `name_attribute` (String): The value for the tool's `name` attribute, which is used by the agent to identify the tool (e.g., "read_specific_section_from_blueprint").
    * `description_attribute` (String): The detailed description of what the tool does, for the agent's understanding.
    * `args_pydantic_model` (String, Optional): The class name of the Pydantic model used for validating the tool's input arguments.
    * `justification_for_custom_tool` (String): An explicit justification for why a custom tool is required to fulfill a specific requirement from the Blueprint that cannot be met by standard tools.
    * `run_method_parameters` (Array of Objects): A structured list of all parameters for the `_run` method. Each object in the array represents one parameter.
        * `name` (String): The name of the parameter (e.g., `section_title`).
        * `python_type` (String): The Python type hint for the parameter (e.g., `str`, `int`, `List[str]`).
    * `run_method_logic` (String): A detailed, step-by-step description or pseudo-code of the logic to be implemented inside the `_run` method. This serves as a direct prompt for the code generator.

* `task_roster` (Array of Objects): Each object represents a task.
    * `task_identifier` (String): Unique name.
    * `description` (String): Detailed operational prompt for the agent. For multimodal tasks, this should include placeholders for image inputs.
    * `assigned_agent_role` (String): The `role` of the designated agent.
    * `quality_gate` (String): A detailed description of the acceptance criteria for the `expected_output`.
    * `expected_output` (String): Definition of the task's output.
    * `enabling_tools` (Array of Strings): List of `tool_id`s from the `tool_repository`.
    * `tool_rationale` (String): Justification for why these tools are chosen for this task.
    * `context_tasks` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
    * `output_pydantic_model` (String, Optional): The `class_name` of a Pydantic model for structured output.
    * `output_pydantic_rationale` (String, Optional): Justification for using Pydantic.

---
**Approved LLM List (For `model` property):**
* model: `gemini/gemini-2.5-flash-preview-05-20`, reasoner: false, multimodal_support: True
* model: `gemini/gemini-2.5-pro-preview-06-05`, reasoner: true, multimodal_support: True
* model: `deepseek/deepseek-chat`, reasoner: false, multimodal_support: False
* model: `deepseek/deepseek-reasoner`, reasoner: true, multimodal_support: False