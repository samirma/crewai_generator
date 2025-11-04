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
        "multimodal": false,
        "llm_rationale": "The StreamlitAppArchitect requires strong code generation, logical structuring, and integration capabilities to build the Streamlit application and ensure all components are correctly displayed. A powerful reasoner like gpt-4o is suitable for ensuring the code is correct, efficient, and adheres to the blueprint's specified structure and UI requirements.",
        "delegation_rationale": "This agent is responsible for the overall application structure and final presentation. While it performs specific coding tasks, it might delegate sub-components or complex UI elements if the application were more extensive. For this blueprint, it primarily orchestrates the UI and integrates outputs from other agents, making delegation a reasonable option for future scalability."
      },
      "yaml_definition": {
        "role": "Streamlit Application Architect",
        "goal": "Design, implement, and populate the Streamlit application for Bitcoin news-driven price predictions, ensuring a clear and user-friendly interface.",
        "backstory": "As a seasoned Streamlit developer, I specialize in creating intuitive and responsive web applications. My expertise lies in structuring Streamlit apps, integrating various data sources, and presenting complex information clearly and engagingly. I ensure the application adheres to the specified layout and delivers a seamless user experience, from initial setup to final content display.",
        "yaml_id": "streamlit_architect"
      },
      "constructor_args": {
        "allow_delegation": true
      }
    },
    {
      "design_metadata": {
        "multimodal": false,
        "llm_rationale": "The NewsDataFetcher needs to understand API documentation, construct HTTP requests, and parse JSON responses reliably. While not requiring deep reasoning for complex logic, it benefits from an LLM capable of accurate code generation for API interactions and robust error handling. gpt-4o provides the necessary reliability and precision for data extraction.",
        "delegation_rationale": "This agent has a highly specialized and focused task of fetching data from external APIs. The process is largely self-contained and does not typically involve sub-tasks that would benefit from delegation to other agents. Its efficiency comes from direct execution of its core responsibility."
      },
      "yaml_definition": {
        "role": "News Data Fetcher",
        "goal": "Reliably gather current Bitcoin-related news articles from specified sources or simulate data if external access is unavailable.",
        "backstory": "I am an expert in web data extraction and API integration. My mission is to efficiently query news APIs, handle responses, and extract relevant information such as headlines, content, publication dates, and sources. I am meticulous about data quality and ensuring the freshest, most pertinent news is collected for analysis, or providing plausible dummy data when real-time access is constrained.",
        "reasoning": "false",
        "yaml_id": "news_fetcher"
      },
      "constructor_args": {
        "allow_delegation": false
      }
    },
    {
      "design_metadata": {
        "multimodal": false,
        "llm_rationale": "The NewsDataFetcher needs to understand API documentation, construct HTTP requests, and parse JSON responses reliably. While not requiring deep reasoning for complex logic, it benefits from an LLM capable of accurate code generation for API interactions and robust error handling. gpt-4o provides the necessary reliability and precision for data extraction.",
        "delegation_rationale": "This agent has a highly specialized and focused task of fetching data from external APIs. The process is largely self-contained and does not typically involve sub-tasks that would benefit from delegation to other agents. Its efficiency comes from direct execution of its core responsibility."
      },
      "yaml_definition": {
        "role": "agent role",
        "goal": "agent goal",
        "backstory": "agent backstory",
        "reasoning": "true",
        "yaml_id": "this_agent_id"
      },
      "constructor_args": {
        "allow_delegation": true
      }
    }
]
```

**Expected `config/agents.yaml` Output:**

```yaml
streamlit_architect:
  role: "Streamlit Application Architect"
  goal: "Design, implement, and populate the Streamlit application for Bitcoin news-driven price predictions, ensuring a clear and user-friendly interface."
  backstory: "As a seasoned Streamlit developer, I specialize in creating intuitive and responsive web applications. My expertise lies in structuring Streamlit apps, integrating various data sources, and presenting complex information clearly and engagingly. I ensure the application adheres to the specified layout and delivers a seamless user experience, from initial setup to final content display."
  allow_delegation: true
news_fetcher:
  role: "News Data Fetcher"
  goal: "Reliably gather current Bitcoin-related news articles from specified sources or simulate data if external access is unavailable."
  backstory: "I am an expert in web data extraction and API integration. My mission is to efficiently query news APIs, handle responses, and extract relevant information such as headlines, content, publication dates, and sources. I am meticulous about data quality and ensuring the freshest, most pertinent news is collected for analysis, or providing plausible dummy data when real-time access is constrained."
  reasoning: False
  allow_delegation: false
this_agent_id:
  role: "agent role"
  goal: "agent goal"
  backstory: "agent backstory"
  reasoning: True
  allow_delegation: true
```