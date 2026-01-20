* **Instruction:** Only use the document identified as 'Project Blueprint' within `{{{ }}}` as your sole source of truth.
* **Objective:** Your task is to elaborate on the detailed architecture plan by providing detailed definitions for each agent and task.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "user_inputs": {
      "type": "array",
      "description": "Based on the 'Project Blueprint', identify variables that will be input of the crewai project. These variables will be used in the main.py kickoff function inputs json (crew().kickoff(inputs=inputs)) and the agents and tasks description files.",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "description": "Variable name" },
          "description": { "type": "string", "description": "What this variable represents" },
          "value": { "type": "string", "description": "Default value for this variable based on the 'Project Blueprint'" }
        },
        "required": ["name", "description", "value"]
      }
    },
    "agent_cadre": {
      "type": "array",
      "description": "Using CrewAI best practices, create a comprehensive list of CrewAI agents to fully execute the 'Project Blueprint', covering all its aspects, details, and specifications. Adhere to CrewAI best practices: 1. Roles should be specific and narrow. 2. Goals must be actionable. 3. Backstories should provide context and expertise.",
      "items": {
        "type": "object",
        "properties": {
          "design_metadata": {
            "type": "object",
            "description": "Contains contextual information and justifications, not included in the final YAML configuration files.",
            "properties": {
              "multimodal": {
                "type": "boolean",
                "description": "`True` ONLY if this agent needs to process both text and images."
              },
              "reasoning_rationale": {
                "type": "string",
                "description": "A justification for the `reasoning: True/False` setting, explaining why this specific agent needs (or doesn't need) a pre-execution planning step."
              },
              "llm_rationale": {
                "type": "string",
                "description": "Justification for the chosen `llm_id`. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability."
              },
              "delegation_rationale": {
                "type": "string",
                "description": "Justification for the `allow_delegation` setting."
              }
            },
            "required": ["multimodal", "reasoning_rationale", "llm_rationale", "delegation_rationale"]
          },
          "yaml_definition": {
            "type": "object",
            "description": "Contains only the parameters for the `config/agents.yaml` file.",
            "properties": {
              "yaml_id": {
                "type": "string",
                "description": "Unique identifier for this agent, used for task assignment. Must be lowercase and use snake_case (e.g., research_analyst)."
              },
              "role": {
                "type": "string",
                "description": "A well defined agent's role. Can include variables from `user_inputs` using `{variable_name}` syntax."
              },
              "goal": {
                "type": "string",
                "description": "A well defined and detailed agent's goal. Can include variables from `user_inputs` using `{variable_name}` syntax."
              },
              "backstory": {
                "type": "string",
                "description": "A narrative that reinforces the agent's expertise and persona. Can include variables from `user_inputs` using `{variable_name}` syntax."
              },
              "reasoning": {
                "type": "boolean",
                "description": "`True` or `False`, only `True` when the justification in `reasoning_rationale` justifies it."
              },
              "allow_delegation": {
                "type": "boolean",
                "description": "`True` or `False`, only `True` when the justification in `delegation_rationale` justifies it."
              }
            },
            "required": ["role", "goal", "backstory", "reasoning", "allow_delegation"]
          }
        },
        "required": ["design_metadata", "yaml_definition"]
      }
    },
    "task_roster": {
      "type": "array",
      "description": "Using CrewAI best practices, create a comprehensive list of tasks to fully execute the 'Project Blueprint', covering all its aspects, details, and specifications. A single step can be extrapolated into one or more tasks if it is too complex, considering the CrewAI recommended architecture.",
      "items": {
        "type": "object",
        "properties": {
          "design_metadata": {
            "type": "object",
            "description": "Contains contextual information and justifications, not included in the final YAML configuration files.",
            "properties": {
              "llm_limitations": {
                "type": "string",
                "description": "A detailed statement explaining the limitations that an LLM imposes. For instance, LLMs lack time awareness, meaning they require external access to the current time if it is needed for task completion."
              },
              "detailed_description": {
                "type": "string",
                "description": "A detailed statement explaining the success criteria for this task and how to archive it."
              }
            },
            "required": ["llm_limitations", "detailed_description"]
          },
          "yaml_definition": {
            "type": "object",
            "description": "Contains only the parameters for the `config/tasks.yaml` file.",
            "properties": {
              "description": {
                "type": "string",
                "description": "Detailed operational prompt for the agent, derived from 'Blueprint's Execution Outline'. MUST include variables from `user_inputs` using `{variable_name}` syntax where relevant."
              },
              "expected_output": {
                "type": "string",
                "description": "**CRITICAL RULE:** This must be a precise description of the **final artifact and its state** that proves the task was successfully completed."
              },
              "agent": {
                "type": "string",
                "description": "The `yaml_id` of the designated agent."
              },
              "yaml_id": {
                "type": "string",
                "description": "Unique yaml_id to be used to identify this task. Must be unique, lowercase, and use snake_case."
              },
              "context": {
                "type": "array",
                "description": "A list of `yaml_id`s from prerequisite tasks. The output of these tasks will be provided as context to this task. Ensure all IDs effectively exist in the `task_roster`.",
                "items": {
                  "type": "string"
                }
              }
            },
            "required": ["description", "expected_output", "agent", "yaml_id"]
          }
        },
        "required": ["design_metadata", "yaml_definition"]
      }
    }
  },
  "required": ["agent_cadre", "task_roster"]
}
```

Your entire response must be a single, valid JSON object derived from the json schema below without include the schema itself. Do not include any other text before or after the JSON.