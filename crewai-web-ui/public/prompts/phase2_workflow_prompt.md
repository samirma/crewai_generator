
* **Instruction:** Only use the previously generated document as a source of truth.
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
          "description": "Justification for enabling or not the support for memory in crewai."
        },
        "activation": {
          "type": "boolean",
          "description": "`True` to enable memory. Default to `False`. Memory adds per-step embedding and memory-analysis LLM calls requiring strict structured output, which small local models frequently fail — slowing every step and risking out-of-memory kills. Enable ONLY when the crew genuinely needs to recall information across separate kickoffs (e.g. a recurring job that must remember previous runs); a one-shot pipeline that passes context between tasks does NOT need memory."
        },
        "embedder_config": {
          "type": "object",
          "description": "Required if `activation` is `True`; omit this key entirely when `activation` is `False`.",
          "properties": {
            "provider": {
              "type": "string",
              "description": "The name of the embedding provider (always use \"onnx\")."
            },
            "rationale": {
              "type": "string",
              "description": "Justification for the embedder choice."
            }
          },
          "required": ["provider", "rationale"]
        }
      },
      "required": ["rationale", "activation"]
    }
  },
  "required": ["workflow_process", "crew_memory"]
}
```


Your entire response must be a single, valid JSON object conforming to the JSON Schema above (do not include the schema itself). Output raw JSON only — no markdown fences, no comments, no text before or after the JSON.