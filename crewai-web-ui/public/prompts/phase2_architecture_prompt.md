## Design Crew Architecture Plan

**Input:** The complete **'Blueprint' document** (in Markdown format). No other information source should be used.

**Process:** Based *solely* on the **complete and detailed 'Blueprint'**, design the optimal CrewAI configuration. This involves developing the complete specifications for tasks, agents, and tools. Your role is exclusively architectural design.

The design process should follow a logical, top-down cascade to ensure robustness and internal consistency. Key considerations include:
* **Self-Correction:** The architecture must include agents and tasks dedicated to quality assurance and critique.
* **Clarity for Code Generation:** The design must clearly separate parameters intended for Python class constructors (`constructor_args`) from the contextual justification for those parameters (`design_metadata`).

### **Design Section Order**

To improve the robustness of the design, the JSON object's keys MUST be in the following order:

1.  `workflow_process`
2.  `validation_and_critique_framework`
3.  `crew_memory`
4.  `llm_registry`
5.  `agent_cadre`
6.  `structured_data_handling`
7.  `tool_repository`
8.  `custom_tool_definitions`
9.  `task_roster`

**'Design-Crew-Architecture-Plan' - JSON Schema:**

* `workflow_process` (Object):
    * `selected_process` (String): "Process.sequential" OR "Process.hierarchical".
    * `justification` (String): Explanation of why this process is optimal, referencing the specific steps in the Blueprint's Execution Outline.
    * `manager_llm_specification` (Object, Optional): Required if `selected_process` is "Process.hierarchical".
        * `llm_id` (String): The identifier for the manager's LLM, chosen from the `llm_registry`.
        * `rationale` (String): Justification for this manager LLM choice, referencing its capabilities (e.g., 'reasoner') from the `llm_registry`.

* `validation_and_critique_framework` (Object):
    * `qa_strategy_description` (String): Describe the overall strategy for ensuring the quality and accuracy of the final output.
    * `critique_cycle_implementation` (String): Detail how critique and feedback loops are structured.
    * `final_validation_step` (String): Describe the final task that will perform a quality check against the `Blueprint`.

* `crew_memory` (Object, Optional):
    * `activation` (Boolean): `True` to enable memory.
    * `rationale` (String, Optional): Why memory is crucial for this crew.
    * `embedder_config` (Object, Optional):
        * `provider` (String): e.g., "ollama".
        * `config` (Object): e.g., `{"model": "nomic-embed-text:latest"}`.
        * `rationale` (String): Justification for the embedder choice.

* `llm_registry` (Array of Objects): A central list defining the complete set of approved LLM configurations for this crew. This list is **pre-defined** and must be populated exactly as follows:
    * `llm_id` (String): A unique identifier for this configuration (e.g., "gemini_pro_reasoner", "deepseek_chat_basic").
    * `model` (String): The model name.
    * `reasoner` (Boolean): `True` if the model has strong reasoning capabilities.
    * `multimodal_support` (Boolean): `True` if the model can process images.
    * `temperature` (Number): MUST BE 0.0.
    * `frequency_penalty` (Number): MUST BE 0.0.
    * `presence_penalty` (Number): MUST BE 0.0.
    * `api_key_env_var` (String, Optional): Environment variable name for the API key.
    * **Pre-defined List to Use:**
        * `gemini/gemini-2.5-flash-preview-05-20` (reasoner: False, multimodal\_support: True)
        * `gemini/gemini-2.5-pro-preview-06-05` (reasoner: True, multimodal\_support: True)
        * `deepseek/deepseek-chat` (reasoner: False, multimodal\_support: False)
        * `deepseek/deepseek-reasoner` (reasoner: True, multimodal\_support: False)

* `agent_cadre` (Array of Objects): Each object represents an agent. The structure separates constructor arguments from design rationale.
    * `design_metadata` (Object): Contains contextual information and justifications, not used for code generation.
        * `multimodal` (Boolean): `True` ONLY if this agent needs to process both text and images.
        * `llm_rationale` (String): Justification for the chosen `llm_id`. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability.
        * `tool_rationale` (String): Explanation of why this agent's toolkit is essential for its goal.
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
    * `model_definitions` (Array of Objects, Optional):
        * `class_name` (String): Python class name.
        * `fields` (Object): Dictionary of field names to their Python types.

* `tool_repository` (Array of Objects): Each object defines a unique tool to be instantiated.
    * `tool_id` (String): A unique identifier for this specific tool instance (e.g., "web\_search\_tool").
    * `usage_justification` (String): A concise explanation of why this tool is essential for the crew's overall mission.
    * `analysis_and_decision` (Object): A structured block to ensure rigorous tool selection.
        * `required_functionality` (String): A clear, one-sentence description of the specific action the tool must perform.
        * `standard_tool_evaluation` (Array of Objects): An evaluation of relevant standard tools.
            * `tool_name` (String): Name of a standard tool from the reference list.
            * `suitability_analysis` (String): Mandatory analysis of WHY this standard tool IS or IS NOT sufficient.
            * `is_sufficient` (Boolean): `True` or `False`.
        * `final_decision_rationale` (String): A concluding statement on tool choice.
    * `is_custom_tool` (Boolean): `True` if no standard tool is sufficient.
    * `class_name` (String): The exact Python class name to instantiate.
    * `initialization_params` (Object, Optional): Constructor parameters for the tool.

* `custom_tool_definitions` (Array of Objects, Optional): Defines the complete implementation for a custom tool.
    * `tool_id` (String): The identifier that links this definition to the `tool_repository`.
    * `name_attribute` (String): The value for the tool's `name` attribute.
    * `description_attribute` (String): The detailed description of the tool's function.
    * `args_pydantic_model` (String, Optional): The class name of the Pydantic model for args validation.
    * `justification_for_custom_tool` (String): Explicit justification for needing a custom tool.
    * `run_method_parameters` (Array of Objects): Parameters for the `_run` method.
        * `name` (String): Parameter name.
        * `python_type` (String): Python type hint.
    * `run_method_logic` (String): A step-by-step description or pseudo-code for the `_run` method.

* `task_roster` (Array of Objects): Each object represents a task.
    * `task_identifier` (String): Unique name for the task.
        * `quality_gate` (String): A detailed description of the acceptance criteria for the `expected_output`.
        * `tool_rationale` (String, Optional): Justification for why these specific tools are chosen for this task.
        * `output_pydantic_rationale` (String, Optional): Justification for using a Pydantic model for the output.
    * `constructor_args` (Object): Contains only the parameters for the CrewAI `Task` class constructor.
        * `description` (String): Detailed operational prompt for the agent. For multimodal tasks, this should include placeholders for image inputs.
        * `agent` (String): The `role` of the designated agent.
        * `expected_output` (String): Definition of the task's output artifact.
        * `tools` (Array of Strings, Optional): List of `tool_id`s from the `tool_repository`.
        * `context` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
        * `output_pydantic` (String, Optional): The `class_name` of a Pydantic model for structured output.
    * `design_metadata` (Object): Contains contextual information and justifications.



**Output:** A **single JSON object** named `'Design-Crew-Architecture-Plan'`. This JSON object must be valid and adhere to the section order and schema defined above.