
* **Instruction:** Only use the previouly generated document as a source of truth.
* **Objective:** Your task is to design a high-level CrewAI configuration. This design must fully implement the goals from the 'Project Blueprint'. Your role is strictly that of an architect; you are not to write code or execute the plan.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.

---

**JSON Schema:**

*   `workflow_process` (Object):
    *   `rationale` (String): The Justification for the choice between Process.sequential and Process.hierarchical, which determined by the complexity and interdependencies of the project goals. Process.sequential is best for linear, straightforward tasks with a clear, predetermined order, where the output of one task is the direct input for the next. This model ensures precise and orderly progression and is suitable for projects with low to medium complexity. In contrast, Process.hierarchical is the ideal choice for complex, multi-stage projects that require dynamic, multi-agent collaboration, where a manager agent delegates tasks to specialized worker agents to achieve a common goal. This model is selected when the solution benefits from a variety of specialized perspectives and complex, non-linear workflows. As input information you should consider all tasks described in the task_roster
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