**`config/agents.yaml` Generation Logic:**

Use the JSON object provided as the single source of truth. Your task is to generate the content for the `config/agents.yaml` file.

*   **Objective:** Iterate through the `agent_cadre` list from the JSON input.
*   **Output Format:** For each agent object in the list, create a YAML entry.
    *   The main key for each agent entry MUST be the `yaml_definition.yaml_id`.
    *   The entry for each agent must include the following keys, with values derived from the corresponding fields in the agent's `yaml_definition` object:
        *   `role`
        *   `goal`
        *   `backstory`
    *   The `allow_delegation` key must be included, with its value taken from `constructor_args.allow_delegation`.
*   **Formatting:**
    *   Ensure the output is a single, valid YAML file content.
    *   Use proper YAML syntax, especially for multi-line strings (`goal` and `backstory`), to ensure they are correctly parsed.

**Example Input JSON Snippet (`agent_cadre`):**

```json
"agent_cadre": [
  {
    "design_metadata": {
      "agent_id": "senior_research_analyst"
    },
    "yaml_definition": {
      "yaml_id": "senior_research_analyst",
      "role": "Senior Research Analyst",
      "goal": "Uncover cutting-edge developments in AI and data science",
      "backstory": "You work at a leading tech think tank. Your goal is to find the most impactful AI and data science advancements."
    },
    "constructor_args": {
      "allow_delegation": false,
      "verbose": true,
      "llm_id": "default_llm",
      "tool_ids": ["search_tool"]
    }
  }
]
```

**Expected `config/agents.yaml` Output:**

```yaml
senior_research_analyst:
  role: "Senior Research Analyst"
  goal: "Uncover cutting-edge developments in AI and data science"
  backstory: "You work at a leading tech think tank. Your goal is to find the most impactful AI and data science advancements."
  allow_delegation: false
```