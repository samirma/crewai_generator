
* **Instruction:** Only use the previouly generated document as a source of truth.
* **Objective:** Your task is to design a high-level CrewAI configuration. This design must fully implement the goals from the 'Project Blueprint'. Your role is strictly that of an architect; you are not to write code or execute the plan.


**JSON Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "workflow_process": {
      "type": "object",
      "properties": {
        "rationale": {
          "type": "string",
          "description": "The Justification for the choice between Process.sequential and Process.hierarchical, which determined by the complexity and interdependencies of the project goals. Process.sequential is best for linear, straightforward tasks with a clear, predetermined order, where the output of one task is the direct input for the next. This model ensures precise and orderly progression and is suitable for projects with low to medium complexity. In contrast, Process.hierarchical is the ideal choice for complex, multi-stage projects that require dynamic, multi-agent collaboration, where a manager agent delegates tasks to specialized worker agents to achieve a common goal. This model is selected when the solution benefits from a variety of specialized perspectives and complex, non-linear workflows. As input information you should consider all tasks described in the task_roster"
        },
        "selected_process": {
          "type": "string",
          "enum": ["Process.sequential", "Process.hierarchical"],
          "description": "`Process.sequential` OR `Process.hierarchical`."
        }
      },
      "required": ["rationale", "selected_process"]
    },
    "crew_memory": {
      "type": "object",
      "properties": {
        "rationale": {
          "type": "string",
          "description": "Justification for enablding or not the support for memory in crewai."
        },
        "activation": {
          "type": "boolean",
          "description": "`True` to enable memory."
        },
        "embedder_config": {
          "type": "object",
          "description": "Required if `activation` is `True` else 'False'.",
          "properties": {
            "provider": {
              "type": "string",
              "description": "The name of the embedding provider (always use, \"ollama\")."
            },
            "config": {
              "type": "object",
              "description": "Provider-specific configuration.",
              "properties": {
                "model": {
                  "type": "string",
                  "description": "The model name (always use, \"mxbai-embed-large\")."
                },
                "base_url_env_var": {
                  "type": "string",
                  "description": "Required for providers like 'ollama'. The environment variable holding the base URL (always use, \"OLLAMA_HOST\")."
                }
              },
              "required": ["model"]
            },
            "rationale": {
              "type": "string",
              "description": "Justification for the embedder choice."
            }
          },
          "required": ["provider", "config", "rationale"]
        }
      },
      "required": ["rationale", "activation"]
    }
  },
  "required": ["workflow_process", "crew_memory"]
}
```


Your entire response must be a single, valid JSON object derived from the json schema below without include the schema itself. Do not include any other text before or after the JSON.