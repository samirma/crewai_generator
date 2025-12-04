* **Instruction:** Only use the document identified as 'Project Blueprint' within `{{{ }}}` as your sole source of truth.
* **Objective:** Your task is to elaborate on the detailed architecture plan by providing detailed definitions for each agent and task.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object following the schema below. Do not include any other text before or after the JSON.

---

**'Detailed-Architecture-Plan' - JSON Schema:**
*   `agent_cadre` (Array of Objects): Using CrewAI best practices, create a comprehensive list of CrewAI agents to fully execute the 'Project Blueprint', covering all its aspects, details, and specifications. Refer to the CrewAI agent specifications at https://docs.crewai.com/en/concepts/agents and the guidelines to follow at https://docs.crewai.com/en/guides/agents/crafting-effective-agents.
    *   `design_metadata` (Object): Contains contextual information and justifications, not included in the final YAML configuration files.
        *   `multimodal` (Boolean): `True` ONLY if this agent needs to process both text and images.
        *   `reasoning_rationale` (String): A justification for the `reasoning: True/False` setting, explaining why this specific agent needs (or doesn't need) a pre-execution planning step.
        *   `llm_rationale` (String): Justification for the chosen `llm_id`. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability.
        *   `delegation_rationale` (String): Justification for the `allow_delegation` setting.
    *   `yaml_definition` (Object): Contains only the parameters for the `config/agents.yaml` file.
        *   `role` (String): From the high-level plan.
        *   `goal` (String): From the high-level plan.
        *   `backstory` (String): A narrative that reinforces the agent's expertise and persona, giving it context and personality. This should align with its role and goal.
        *   `reasoning` (Boolean): `True` or `False`, only `True` when the justification in `reasoning_rationale` justifies it.
        *   `yaml_id` (String): Unique identifier for this agent, used for task assignment. Must be lowercase and use snake_case (e.g., research_analyst).

*   `task_roster` (Array of Objects): Using CrewAI best practices, create a comprehensive list of tasks to fully execute the 'Project Blueprint', covering all its aspects, details, and specifications. A single step can be extrapolated into one or more tasks if it is too complex, considering the CrewAI recommended architecture.
    *   `design_metadata` (Object): Contains contextual information and justifications, not included in the final YAML configuration files.
        *   `detailed_description` (String): A detailed statement explanning the success criteria for this task and how to archive it.
    *   `yaml_definition` (Object): Contains only the parameters for the `config/tasks.yaml` file.
        *   `description` (String): Detailed operational prompt for the agent, derived from 'Blueprint's Execution Outline'.
        *   `expected_output` (String): **CRITICAL RULE:** This must be a precise description of the **final artifact and its state** that proves the task was successfully completed.
        *   `agent` (String): The `yaml_id` of the designated agent.
        *   `yaml_id` (String): Unique yaml_id to be used to identify this task. Must be unique, lowercase, and use snake_case.
        *   `context` (Array of Strings, Optional): A list of `yaml_id`s from prerequisite tasks. The output of these tasks will be provided as context to this task.