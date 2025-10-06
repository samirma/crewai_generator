* **Instruction:** Use the 'Project Blueprint' and the JSON from the previous architectural phases as your sources of truth.
* **Objective:** Your task is to define the agents, tasks, and any necessary Pydantic models for the CrewAI project. This is the core of the crew's operational design.
* **Self-Correction:** The final design must include agents and tasks specifically for quality assurance and critique to ensure the output is of the highest quality.
* **Output Structure:** The design must clearly separate technical parameters (`constructor_args`) from contextual justification (`design_metadata`).
* **Final Output Format:** Your entire response must be a single JSON object with three keys: `agent_cadre`, `pydantic_model_definitions`, and `task_roster`. Do not include any other text before or after the JSON.

---

**'Design-Crew-Architecture-Plan' - JSON Schema Section:**

*   `agent_cadre` (Array of Objects): Each object represents an agent. The structure separates constructor arguments from design rationale.
    *   `design_metadata` (Object): Contains contextual information and justifications, not used for code generation.
        *   `multimodal` (Boolean): `True` ONLY if this agent needs to process both text and images.
        *   `llm_rationale` (String): Justification for the chosen `llm_id`. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability.
        *   `delegation_rationale` (String): Justification for the `allow_delegation` setting.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `Agent` class constructor.
        *   `role` (String): Concise functional title that defines the agent's expertise. This acts as the primary identifier for the agent.
        *   `goal` (String): A single, focused sentence describing the agent's primary objective and what it is responsible for.
        *   `backstory` (String): A narrative that reinforces the agent's expertise and persona, giving it context and personality. This should align with its role and goal.
        *   `llm_id` (String): The identifier of the LLM to be used by this agent, referencing an entry in the `llm_registry`.
        *   `tools` (Array of Strings, Optional): List of `tool_id`s from the `tool_repository` that this agent is equipped with. **For MCP Servers, the agent gains access to all tools provided by the server. You must reference the `tool_id` of the adapter itself (e.g., "web_scout_adapter").**
        *   `allow_delegation` (Boolean): `True` or `False`.

*   `pydantic_model_definitions` (Array of Objects): Defines the Pydantic models for structured task outputs.
    *   `model_id` (String): A unique identifier for the model, which will become the Python class name (e.g., "ProfileAnalysisResult").
    *   `model_description` (String): A docstring for the Pydantic model class, explaining its purpose.
    *   `is_root_model` (Boolean): **Set to `true` if the model should wrap a single type (like `List[str]`). Set to `false` for a standard model with multiple named fields.**
    *   `model_fields` (Array of Objects): A list of fields for the model.
        *   **If `is_root_model` is `true`:** This array MUST contain exactly one object. The `name` can be a placeholder like `"root"`, and the `python_type` defines the type the `RootModel` will wrap (e.g., `List[str]`).
        *   **If `is_root_model` is `false`:** This array contains all the named fields for a standard `BaseModel`.
        *   `name` (String): The name of the attribute (e.g., "summary", "skills_list"). **Must NOT be `__root__`**.
        *   `python_type` (String): The Python type hint for the field (e.g., "str", "List[str]", "Optional[int]").
        *   `description` (String): A clear description of the field's content, used for the Pydantic `Field` description.

*   `task_roster` (Array of Objects): **This is the most critical section of the design.** Each task definition must be treated as a direct, precise set of instructions for a new team member who needs explicit guidance. Each object represents a task, separating design rationale from instantiation parameters.
    *   `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        *   `task_identifier` (String): A unique name for the task, used for context linking.
        *   **`blueprint_reference` (String): The `step_id` from the Phase 1 Blueprint's 'Logical Steps' that this task implements. This is mandatory for traceability.**
        *   **`blueprint_step_action` (String): A direct copy of the 'Action' from the corresponding blueprint step.**
        *   **`blueprint_step_success_criteria` (String): A direct copy of the 'Success Criteria for this step' from the corresponding blueprint step.**
        *   **`blueprint_step_error_handling` (String): A direct copy of the 'Error Handling & Edge Cases' from the corresponding blueprint step.**
        *   `quality_gate` (String): A high-level, human-readable statement of the success criteria for this task. This should answer the question: "How do we know this task was completed successfully and correctly?" It acts as a final check on the `expected_output`, ensuring it aligns with the overall goals of the project.
        *   `tool_rationale` (String, Optional): Justification for why the assigned agent needs specific tools to complete this task.
        *   `output_rationale` (String, Optional): Justification for using a for the output.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `Task` class constructor.
        *   `description` (String): **CRITICAL RULE:** This must be a highly specific, action-oriented prompt written **directly to the agent**. This is not a comment; it is the core instruction. It must be a synthesis of the `blueprint_step_action`, incorporating guidance on how to handle potential issues from `blueprint_step_error_handling`. It must use active verbs and break down the process into clear, logical steps. It should explicitly state *how* the agent should use its tools and the context it receives. **Crucially, if the task's ultimate goal is to create a file, the final step in the description MUST be an unambiguous command to use the file-writing tool to save the generated content to a specific file path.** For example: "...Finally, you MUST use the `file_writer_tool` to save this content to `{output_path}`."
        *   `agent` (String): The `role` of the designated agent.
        *   `expected_output` (String): **CRITICAL RULE:** This must be a precise description of the **final artifact and its state** that proves the task was successfully completed.
            > **If using a Pydantic model (`output_json` is set):** This description must detail the *expected content* that will populate the fields of the Pydantic model. For example: "A fully populated Pydantic object containing a concise summary of the user's profile, a list of their technical skills, and a list of their soft skills."
            > **If creating a file:** The description MUST start by confirming the file's creation. Instead of describing only the content (e.g., "A JSON object..."), it must be phrased as: "**A file named `{file_path}` is successfully created in the file system.** The content of this file must be a {description of content, e.g., 'valid JSON object with the keys `summary`, `experience`, and `skills`'}." This makes the physical existence of the file the primary success criterion.
        *   `output_json` (String, Optional): The `model_id` of the Pydantic model (from `pydantic_model_definitions`) that this task must output. If this is specified, the task's result will be an instance of this Pydantic class.
        *   `context` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
        *   `tools` (Array of Strings, Optional): List of tool_ids from the tool_repository. For MCP Servers, the agent gains access to all tools provided by the server. You must pass the .tools property of the adapter instance to the task, so here you should reference the tool_id of the adapter itself (e.g., "web_scout_adapter").