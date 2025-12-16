
Use the JSON object provided as the single source of truth.

*   **Objective:** Iterate through the `agent_cadre` list from the JSON input.
*   **Output Format:** For each task object in the list, create a YAML entry.
    *   The main key for each task entry MUST be the `yaml_definition.yaml_id`.
    *   The entry for each task must include the following keys of a valid CrewAi agent YAML file, with values derived from the corresponding fields in the task's `yaml_definition` object.
*   **Formatting:**
    *   Ensure the output is a single, valid CrewAi agent YAML file.
    *   Use proper YAML syntax, especially for multi-line strings (`goal` and `backstory`), to ensure they are correctly parsed.

**Example Input JSON Snippet (`agent_cadre`):**

```json
{
  "agent_cadre": [
    {
      "design_metadata": {
        "multimodal": false,
        "reasoning_rationale": "The agent performs data extraction and analysis using textual inputs only; no image processing is required.",
        "llm_rationale": "The 'research_analyst' model (e.g., gpt-4o) has strong reasoning capabilities for synthesizing news sentiment and financial metrics, making it suitable for structured prediction tasks.",
        "delegation_rationale": "Delegation to the writer is appropriate after analysis is complete to ensure polished, formatted output without redundant processing."
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
        "multimodal": false,
        "reasoning_rationale": "The agent performs statistical modeling and confidence scoring using structured numerical outputs from prior steps; no image processing is involved.",
        "llm_rationale": "The 'modeler' model (e.g., claude-3-sonnet) excels at mathematical reasoning, regression analysis, and probabilistic forecasting, supporting accurate prediction generation under defined constraints.",
        "delegation_rationale": "Delegation to the writer follows modeling completion to transform raw forecasts into narrative form for final reporting."
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
  reasoning: True
  allow_delegation: True

predictive_modeler:
  role: >
    Predictive Modeler
  goal: >
    Generate hourly and weekly Bitcoin price movement predictions with confidence scores using weighted regression on sentiment, volatility, and historical trends.
  backstory: >
    A quantitative analyst skilled in time-series forecasting and econometric modeling, capable of integrating diverse data streams into statistically grounded projections with transparent uncertainty quantification.
  reasoning: True
  allow_delegation: True
```