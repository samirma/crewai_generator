* **Instruction:** Use the `agent_cadre` section from the 'Design-Crew-Architecture-Plan' JSON as your sole source of truth.
* **Objective:** Your task is to generate the complete content for a valid `agents.yaml` file compatible with the `crewai` CLI.
* **Final Output Format:** Your entire response must be a single YAML code block enclosed in ```yaml ... ```. Do not include any other text or explanations before or after the code block.

---

### **YAML Generation Rules**

1.  **Iterate through Agents:** For each agent object within the `agent_cadre` array in the input JSON, you will create one top-level entry in the YAML file.

2.  **Top-Level Key:**
    *   The main key for each agent definition in the YAML MUST be derived from the agent's `role` (located in `constructor_args`).
    *   Convert the `role` string into a valid snake_case identifier. For example, "Financial Analyst" becomes `financial_analyst`.

3.  **Agent Attributes:**
    *   Under each top-level agent key, create the following attributes.
    *   The values for these attributes MUST be taken directly from the corresponding agent's `constructor_args` object in the JSON.
    *   **Required Attributes:**
        *   `role`: (String)
        *   `goal`: (String)
        *   `backstory`: (String)
        *   `llm`: (String) - Use the `llm_id` from the JSON.
        *   `allow_delegation`: (Boolean)
    *   **Conditional `tools` Attribute:**
        *   If the `tools` array in the agent's `constructor_args` is present and not empty, you MUST include a `tools` key in the YAML.
        *   The value will be a YAML list of strings, where each string is a `tool_id` from the JSON's `tools` array.
        *   If the `tools` array is empty or not present, you MUST omit the `tools` key entirely from the agent's definition in the YAML.

### **Example**

**Input JSON (`agent_cadre` section):**
```json
[
  {
    "constructor_args": {
      "role": "Content Strategist",
      "goal": "Develop content strategies",
      "backstory": "A seasoned strategist...",
      "llm_id": "gemini_pro_reasoner",
      "tools": ["web_search_tool", "file_writer_tool"],
      "allow_delegation": true
    }
  }
]
```

**Correct YAML Output:**
```yaml
content_strategist:
  role: Content Strategist
  goal: Develop content strategies
  backstory: A seasoned strategist...
  llm: gemini_pro_reasoner
  allow_delegation: true
  tools:
    - web_search_tool
    - file_writer_tool
```