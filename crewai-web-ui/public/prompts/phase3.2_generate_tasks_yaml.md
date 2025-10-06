* **Instruction:** Use the `task_roster` section from the 'Design-Crew-Architecture-Plan' JSON as your sole source of truth.
* **Objective:** Your task is to generate the complete content for a valid `tasks.yaml` file compatible with the `crewai` CLI.
* **Final Output Format:** Your entire response must be a single YAML code block enclosed in ```yaml ... ```. Do not include any other text or explanations before or after the code block.

---

### **YAML Generation Rules**

1.  **Iterate through Tasks:** For each task object within the `task_roster` array in the input JSON, you will create one top-level entry in the YAML file.

2.  **Top-Level Key:**
    *   The main key for each task definition in the YAML MUST be the `task_identifier` from the task's `design_metadata`.

3.  **Task Attributes:**
    *   Under each top-level task key, create the following attributes.
    *   The values for these attributes MUST be taken directly from the corresponding task's `constructor_args` object in the JSON, unless otherwise specified.
    *   **Required Attributes:**
        *   `description`: (String)
        *   `agent`: (String) - Use the `role` of the agent.
        *   `expected_output`: (String)
    *   **Conditional Attributes:**
        *   `output_json`: If the `output_json` key exists and is not null in the JSON, include it in the YAML. The value should be the `model_id`.
        *   `context`: If the `context` array exists and is not empty in the JSON, include it in the YAML. The value will be a YAML list of `task_identifier` strings.
        *   `tools`: If the `tools` array exists and is not empty in the JSON, include it in the YAML. The value will be a YAML list of `tool_id` strings.
        *   If any of these conditional keys are not present or are empty in the JSON, you MUST omit them from the YAML output for that task.

### **Example**

**Input JSON (`task_roster` section):**
```json
[
  {
    "design_metadata": {
      "task_identifier": "market_analysis_task"
    },
    "constructor_args": {
      "description": "Analyze the market trends for AI.",
      "agent": "Market Analyst",
      "expected_output": "A report on market trends.",
      "context": ["data_gathering_task"],
      "tools": ["web_search_tool"],
      "output_json": "MarketAnalysisReport"
    }
  }
]
```

**Correct YAML Output:**
```yaml
market_analysis_task:
  description: Analyze the market trends for AI.
  agent: Market Analyst
  expected_output: A report on market trends.
  context:
    - data_gathering_task
  tools:
    - web_search_tool
  output_json: MarketAnalysisReport
```