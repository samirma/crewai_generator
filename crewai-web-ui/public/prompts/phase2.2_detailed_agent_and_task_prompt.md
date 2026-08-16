* **Instruction:** Use the document identified as 'Project Blueprint' within `{{{ }}}` and the yaml as your sole source of truth. Note the yaml defines the configuration variables, where the name is the variable name and the description should be used be better guide to generate the agent and task definitions.
* **Objective:** Your task is to elaborate on the detailed architecture plan by providing detailed definitions for each agent and task.
* **CRITICAL BRACE RULE:** In every `role`, `goal`, `backstory`, `description`, and `expected_output` string, curly braces may ONLY appear as `{variable_name}` references to `user_inputs` names defined in the project configuration YAML. Any other literal `{` or `}` (JSON examples, code snippets, set notation) is FORBIDDEN — describe such structures in words instead. Unknown `{placeholders}` crash the crew at kickoff during input interpolation.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "agent_cadre": {
      "type": "array",
      "description": "Using CrewAI best practices, create the SMALLEST list of CrewAI agents that fully executes the 'Project Blueprint'. RIGHT-SIZE the crew to the complexity of the user's request: a simple request with a single deliverable (e.g. research a topic and write one report) must use 2-4 agents; only genuinely multi-faceted projects justify more, and never exceed 6. Merge related responsibilities into one agent (e.g. one researcher covering several angles, not one agent per angle) — every extra agent multiplies LLM calls and runtime. Adhere to CrewAI best practices: 1. Roles should be specific and narrow. 2. Goals must be actionable. 3. Backstories should provide context and expertise.",
      "items": {
        "type": "object",
        "properties": {
          "design_metadata": {
            "type": "object",
            "description": "Contains contextual information and justifications, not included in the final YAML configuration files.",
            "properties": {
              "reasoning_rationale": {
                "type": "string",
                "description": "A justification for the `reasoning: True/False` setting, explaining why this specific agent needs (or doesn't need) a pre-execution planning step."
              },
              "delegation_rationale": {
                "type": "string",
                "description": "A justification for the `allow_delegation: True/False` setting, explaining why this specific agent should (or should not) be able to delegate work to other agents."
              }
            },
            "required": ["reasoning_rationale", "delegation_rationale"]
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
                "description": "A well defined agent's role. Can include configuration variables using `{variable_name}` syntax."
              },
              "goal": {
                "type": "string",
                "description": "A well defined and detailed agent's goal. Can include configuration variables using `{variable_name}` syntax."
              },
              "backstory": {
                "type": "string",
                "description": "A narrative that reinforces the agent's expertise and persona. Can include configuration variables using `{variable_name}` syntax."
              },
              "reasoning": {
                "type": "boolean",
                "description": "`True` or `False`. Default to `False`. Each `True` adds pre-execution planning LLM calls requiring strict structured output, which small local models frequently fail — causing replan loops and multiplying runtime. Set `True` for AT MOST one agent, and only when its task involves genuinely complex multi-step orchestration that would fail without an explicit plan."
              },
              "allow_delegation": {
                "type": "boolean",
                "description": "`True` or `False`, only `True` when the justification in `delegation_rationale` justifies it."
              }
            },
            "required": ["yaml_id", "role", "goal", "backstory", "reasoning", "allow_delegation"]
          }
        },
        "required": ["design_metadata", "yaml_definition"]
      }
    },
    "task_roster": {
      "type": "array",
      "description": "Using CrewAI best practices, create the SMALLEST list of tasks that fully executes the 'Project Blueprint'. RIGHT-SIZE the roster: merge blueprint steps that share an agent and data flow into a single task (e.g. one research task covering several angles, not one task per angle); a simple single-deliverable request should need 3-5 tasks, never more than 7. Split a step into multiple tasks only when it is genuinely too complex for one task. Every extra task adds significant runtime.",
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
                "description": "A detailed statement explaining the success criteria for this task and how to achieve it."
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
                "description": "Detailed operational prompt for the agent, derived from 'Blueprint's Execution Outline'. Can include configuration variables using `{variable_name}` syntax where relevant."
              },
              "expected_output": {
                "type": "string",
                "description": "**CRITICAL RULE:** This must be a precise description of the **final artifact and its state** that proves the task was successfully completed. Can include configuration variables using `{variable_name}` syntax where relevant."
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
              },
              "output_file": {
                "type": "string",
                "description": "OPTIONAL. Set ONLY on the final task that produces a file deliverable declared in the project configuration outputs. MUST be a template reference to a `user_inputs` variable holding the path (e.g., \"{output_path}\") — NEVER a hardcoded literal path (CrewAI strips the leading slash from literal paths, relocating the file). CrewAI writes the task's final output to this path natively; prefer this over a file-writing tool for final artifacts."
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

Your entire response must be a single, valid JSON object conforming to the JSON Schema above (do not include the schema itself). Output raw JSON only — no markdown fences, no comments, no text before or after the JSON.