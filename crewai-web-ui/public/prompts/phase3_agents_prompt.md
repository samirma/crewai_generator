
Use the JSON object provided as the single source of truth. Your task is to generate the content for the `config/agents.yaml` file.

*   **Objective:** Iterate through the `agent_cadre` list from the JSON input.
*   **Output Format:** For each agent object in the list, create a YAML entry.
    *   The main key for each agent entry MUST be the `yaml_definition.yaml_id`.
    *   The entry for each agent must contain EXACTLY these keys, copied from the agent's `yaml_definition` object: `role`, `goal`, `backstory`, `allow_delegation`.
    *   Do NOT emit `reasoning` — it is deprecated in agents.yaml; the code-generation phase maps the reasoning flag to `planning_config` instead. Do NOT emit any other key: unknown keys are silently dropped by CrewAI and only mislead.
*   **Formatting:**
    *   Ensure the output is a single, valid YAML file content.
    *   Use proper YAML syntax, especially for multi-line strings (`role`, `goal`, and `backstory`).
    *   Copy boolean values exactly as given in the input JSON — never change them.
    *   Curly braces may ONLY appear as `{variable_name}` references already present in the input strings; never introduce new literal `{` or `}`.

**Example Input JSON Snippet (`agent_cadre`):**

```json
{
  "agent_cadre": [
    {
      "design_metadata": {
        "reasoning_rationale": "The agent performs data extraction and analysis requiring a pre-execution planning step to sequence sources correctly.",
        "delegation_rationale": "This agent works independently on its own analysis; no delegation is needed."
      },
      "yaml_definition": {
        "role": "Research Analyst",
        "goal": "Aggregate real-time news sentiment and macroeconomic indicators to generate a composite Bitcoin market sentiment score.",
        "backstory": "A financial data specialist with expertise in cryptocurrency markets, experienced in parsing news outlets and translating qualitative sentiment into quantifiable metrics for predictive modeling.",
        "reasoning": true,
        "allow_delegation": false,
        "yaml_id": "research_analyst"
      }
    },
    {
      "design_metadata": {
        "reasoning_rationale": "The agent performs statistical modeling and confidence scoring that benefits from a pre-execution plan.",
        "delegation_rationale": "Modeling is self-contained; delegation would add redundant processing."
      },
      "yaml_definition": {
        "role": "Predictive Modeler",
        "goal": "Generate hourly and weekly Bitcoin price movement predictions with confidence scores using weighted regression on sentiment, volatility, and historical trends.",
        "backstory": "A quantitative analyst skilled in time-series forecasting and econometric modeling, capable of integrating diverse data streams into statistically grounded projections with transparent uncertainty quantification.",
        "reasoning": true,
        "allow_delegation": false,
        "yaml_id": "predictive_modeler"
      }
    }
]
}
```

**Expected YAML Output:**

```yaml
research_analyst:
  role: >
    Research Analyst
  goal: >
    Aggregate real-time news sentiment and macroeconomic indicators to generate a composite Bitcoin market sentiment score.
  backstory: >
    A financial data specialist with expertise in cryptocurrency markets, experienced in parsing news outlets and translating qualitative sentiment into quantifiable metrics for predictive modeling.
  allow_delegation: False

predictive_modeler:
  role: >
    Predictive Modeler
  goal: >
    Generate hourly and weekly Bitcoin price movement predictions with confidence scores using weighted regression on sentiment, volatility, and historical trends.
  backstory: >
    A quantitative analyst skilled in time-series forecasting and econometric modeling, capable of integrating diverse data streams into statistically grounded projections with transparent uncertainty quantification.
  allow_delegation: False
```

CRITICAL OUTPUT FORMAT: Your entire response must be ONLY the raw YAML content of `agents.yaml` — no markdown fences, no explanations, no text before or after. The response is written to disk verbatim.