## Phase 2: Project Configuration

**Input:** Blueprint from Phase 1 (from the `{{{ }}}` delimiters).

**Goal:** configuration for the project.

**Output:** A `project_config.yaml` file.

**'project_config.yaml' - Mandatory Fields:**

*   **id:** A unique identifier for the project (e.g., snake_case name).
*   **description:** One simple sentence explaining the project.
*   **outputs:** A list of the full path of the output(s) of the project, restricted to only the deliverables defined in the blueprint.
    *   **name:** A descriptive name for the output.
    *   **description:** A comprehensive description of the output contents.
    *   **format:** The format of the output (e.g., 'JSON', 'PDF', 'HTML').
    *   **location:** The location where the output will be stored, only if needed (e.g., 'src/data/resume.json'), otherwise suppress that field.