
* **Instruction:** Only use the document identified as 'Project Blueprint' within `{{{ }}}` as your sole source of truth.
* **Objective:** Your task is to elaborate on the high-level architecture plan by providing detailed definitions for each agent and task.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object following the schmea below. Do not include any other text before or after the JSON.

---

**'Detailed-Architecture-Plan' - JSON Schema:**

*   `agent_cadre` (Array of Objects):  Using CrewAI best practices, create a comprehensive list of agent to fully execute the 'Project Blueprint', covering all its aspects, details, and specifications.
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
        *   `allow_delegation` (Boolean): `True` or `False`.

*   `task_roster` (Array of Objects): Using CrewAI best practices, create a comprehensive list of tasks to fully execute the 'Project Blueprint', covering all its aspects, details, and specifications. A single step can be extrapolated into one or more tasks if it is too complex, considering the CrewAI recommended architecture.
    *   `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        *   `task_identifier` (String): From the high-level plan.
        *   `quality_gate` (String): A high-level, human-readable statement of the success criteria for this task.
    *   `yaml_definition` (Object): Contains only the parameters for config/tasks.yaml file.
        *   `description` (String): Detailed operational prompt for the agent, derived from 'Blueprint's Execution Outline'.
        *   `expected_output` (String): **CRITICAL RULE:** This must be a precise description of the **final artifact and its state** that proves the task was successfully completed.
        *   `agent` (String): The `yaml_id` of the designated agent.
        *   `yaml_id` (String): Unique yaml_id to be used to indendify this task.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `Task` class constructor.
        *   `context` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
