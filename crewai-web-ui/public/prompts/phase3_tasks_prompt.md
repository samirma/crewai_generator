
Use the JSON object provided as the single source of truth. Your task is to generate the content for the `config/tasks.yaml` file.

*   **Objective:** Iterate through the `task_roster` list from the JSON input.
*   **Output Format:** For each task object in the list, create a YAML entry.
    *   The main key for each task entry MUST be the task's `yaml_definition.yaml_id`.
    *   `agent:` MUST be the AGENT's yaml_id, copied verbatim from `yaml_definition.agent`.
    *   The entry may contain ONLY these keys: `description`, `expected_output`, `agent`, `context` (only when present in the JSON), `output_file` (only when present in the JSON). NEVER emit `verbose` or any other key — unknown keys are silently dropped by CrewAI and only mislead.
    *   `output_file` must be copied verbatim from the JSON in template form (e.g., `"{output_path}"`) — never rewrite it into a literal path.
*   **Formatting:**
    *   Ensure the output is a single, valid YAML file content.
    *   Use proper YAML syntax, especially for multi-line strings (`description` and `expected_output`).
    *   Curly braces may ONLY appear as `{variable_name}` references already present in the input strings; never introduce new literal `{` or `}`.

**Example Input JSON Snippet (`task_roster`):**

```json
"yaml_definition": {
  "description": "Some generic description",
  "expected_output": "generic_output",
  "agent": "prediction_strategist",
  "yaml_id": "generate_bitcoin_predictions",
  "context": [
    "analyze_news_sentiment",
    "gather_historical_btc_data"
  ],
  "output_file": "{output_path}"
}
```

**Expected Output:**

```yaml
generate_bitcoin_predictions:
  description: >-
    Some generic description
  expected_output: >-
    generic_output
  agent: prediction_strategist
  context:
    - analyze_news_sentiment
    - gather_historical_btc_data
  output_file: "{output_path}"
```

CRITICAL OUTPUT FORMAT: Your entire response must be ONLY the raw YAML content of `tasks.yaml` — no markdown fences, no explanations, no text before or after. The response is written to disk verbatim.