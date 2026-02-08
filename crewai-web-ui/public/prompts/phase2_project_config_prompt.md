## Phase 2: Project Configuration

**Input:** Blueprint from Phase 1 (from the `{{{ }}}` delimiters).

**Goal:** configuration for the project.

**Output:** A `project_config.yaml` file.

**'project_config.yaml' - Mandatory Fields:**

*   **id:** A unique identifier for the project (e.g., snake_case name).
*   **description:** One simple sentence explaining the project.
*   **user_inputs:** An array of configuration variables that control the crew's operational parameters and are known BEFORE execution begins. These are tuning knobs, file paths, thresholds, and time horizon definitions that configure agent behavior. EXCLUDE any dynamic data that the agents are tasked with gathering during execution (such as current dates/timestamps, live data, news events, etc). If the 'Project Blueprint' describes a data gathering step (e.g., 'fetch current price', 'retrieve timestamp', 'scrape news'), those data points are AGENT RESPONSIBILITIES, not user inputs. User inputs should be limited to: numerical thresholds (confidence_threshold, max_retries), time window definitions (short_term_hours, medium_term_days), filesystem paths (output_path), and static classification criteria (whale_threshold_btc).
    *   **name:** Variable name.
    *   **description:** What this variable represents.
    *   **value:** Default value for this variable based on the 'Project Blueprint'.
*   **outputs:** A list of the full path of the output(s) of the project, restricted to only the deliverables defined in the blueprint.
    *   **name:** A descriptive name for the output.
    *   **description:** A comprehensive description of the output contents.
    *   **format:** The format of the output (e.g., 'JSON', 'PDF', 'HTML').
    *   **location:** The location where the output will be stored, only if needed (e.g., 'src/data/resume.json'), otherwise suppress that field.