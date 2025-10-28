
* **Instruction:** Only use the document identified as 'Project Blueprint' within `{{{ }}}` as your sole source of truth.
* **Objective:** Your task is to design a high-level CrewAI configuration. This design must fully implement the goals from the 'Project Blueprint'. Your role is strictly that of an architect; you are not to write code or execute the plan.
* **Output Structure:** The design must be a JSON object with the following keys: `workflow_process`, `crew_memory`, `agent_cadre`, and `task_roster`.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.

---

**'High-Level-Architecture-Plan' - JSON Schema:**

*   `workflow_process` (Object):
    *   `rationale` (String): The Justification for the choice between Process.sequential and Process.hierarchical.
    *   `selected_process` (String): `Process.sequential` OR `Process.hierarchical`.

*   `crew_memory` (Object):
    *   `rationale` (String): Justification for enablding or not the support for memory in crewai.
    *   `activation` (Boolean): `True` to enable memory.
    *   `embedder_config` (Object, Optional): Required if `activation` is `True` else 'False'.
        *   `provider` (String): The name of the embedding provider (e.g., "ollama").
        *   `config` (Object): Provider-specific configuration.
            *   `model` (String): The model name (e.g., "mxbai-embed-large:latest").
            *   `base_url_env_var` (String, Optional): **Required for providers like 'ollama'.** The environment variable holding the base URL (e.g., "OLLAMA_HOST").
        *   `rationale` (String): Justification for the embedder choice.

*   `agent_cadre` (Array of Objects): Each object represents an agent.
    *   `role` (String): Concise functional title that defines the agent's expertise.
    *   `goal` (String): A single, focused sentence describing the agent's primary objective.
    *   `responsibilities` (String): A brief description of the agent's responsibilities.

*   `task_roster` (Array of Objects): Each object represents a task.
    *   `task_identifier` (String): A unique name for the task.
    *   `description` (String): A brief description of the task.
