**`config/tasks.yaml` Generation Logic:**

Use the JSON object provided as the single source of truth. Your task is to generate the content for the `config/tasks.yaml` file.

*   **Objective:** Iterate through the `task_roster` list from the JSON input.
*   **Output Format:** For each task object in the list, create a YAML entry.
    *   The main key for each task entry MUST be the `yaml_definition.yaml_id`.
    *   The entry for each task must include the following keys, with values derived from the corresponding fields in the task's `yaml_definition` object:
        *   `description`
        *   `expected_output`
    *   The `agent` key must be included, with its value taken from `constructor_args.agent_id`.
*   **Conditional Keys:**
    *   `context`: This key should only be included if the `constructor_args.context_task_ids` array is present and not empty. The value should be the `yaml_definition.yaml_id` of the task "task_identifier" in the list.
*   **Formatting:**
    *   Ensure the output is a single, valid YAML file content.
    *   Use proper YAML syntax, especially for multi-line strings (`description` and `expected_output`).

**Example Input JSON Snippet (`task_roster`):**

```json
"task_roster": [
  {
    "design_metadata": {
      "task_id": "research_task"
    },
    "yaml_definition": {
      "yaml_id": "research_task",
      "description": "Identify the top 3 most impactful AI advancements in the last month.",
      "expected_output": "A list of 3 AI advancements with a brief description of each."
    },
    "constructor_args": {
      "agent_id": "senior_research_analyst",
      "context_task_ids": [],
      "output_pydantic_model": null
    }
  }
]
```

**Expected `config/tasks.yaml` Output:**

```yaml
research_task:
  description: "Identify the top 3 most impactful AI advancements in the last month."
  expected_output: "A list of 3 AI advancements with a brief description of each."
  agent: "senior_research_analyst"
```