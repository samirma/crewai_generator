
Use the JSON object provided as the single source of truth. Your task is to generate the content for the `config/tasks.yaml` file.

*   **Objective:** Iterate through the `task_roster` list from the JSON input.
*   **Output Format:** For each task object in the list, create a YAML entry.
    *   The main key for each task entry MUST be the `yaml_definition.yaml_id`.
    *   The entry for each task must include the following keys of a valid CrewAi task YAML file, with values derived from the corresponding fields in the task's `yaml_definition` object.
*   **Formatting:**
    *   Ensure the output is a single, valid YAML file content.
    *   Use proper YAML syntax, especially for multi-line strings (`description` and `expected_output`).

**Example Input JSON Snippet (`task_roster`):**

```json
"yaml_definition": {
  "description": "Some generic description",
  "expected_output": "generic_output",
  "agent": "prediction_strategist",
  "yaml_id": "task_agent_id",
  "context": [
    "analyze_news_sentiment",
    "gather_historical_btc_data"
  ],
}
```

**Expected Output:**

```yaml
generate_bitcoin_predictions:
  description: >-
    Some generic description
  expected_output: >-
    generic_output
  agent: task_agent_id
  context:
    - analyze_news_sentiment
    - gather_historical_btc_data
  verbose: true
```