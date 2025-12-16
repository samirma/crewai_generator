
* **Instruction:** Only use the previouly generated document as a source of truth.
* **Objective:** Your task is to generate the complete definition for any custom tools that were identified in the tool selection plan.
* **Output Structure:** The output should be a JSON object with a single key: `custom_tools`.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.

---

**'Custom-Tool-Generation-Plan' - JSON Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "custom_tools": {
      "type": "array",
      "description": "A list of custom tool definitions, used only when `is_custom_tool` is `True`.",
      "items": {
        "type": "object",
        "properties": {
          "design_metadata": {
            "type": "object",
            "properties": {
              "tool_id": {
                "type": "string",
                "description": "The current design_metadata.tool_id."
              },
              "description": {
                "type": "string",
                "description": "A detailed description of the tool's function to better orient its development in pyhton, including the output."
              }
            },
            "required": ["tool_id", "description"]
          },
          "class_definition": {
            "type": "object",
            "description": "Defines the necessary arguments for generating the custom tool's class structure.",
            "properties": {
              "class_name": {
                "type": "string",
                "description": "The Python class name."
              },
              "name_attribute": {
                "type": "string",
                "description": "The value for the tool's `name` attribute."
              },
              "description_attribute": {
                "type": "string",
                "description": "The value for the tool's `description` attribute."
              },
              "run_method_parameters": {
                "type": "array",
                "description": "Defines the parameters for the tool's `_run` method.",
                "items": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "description": "The parameter's name (e.g., \"url\")."
                    },
                    "python_type": {
                      "type": "string",
                      "description": "The parameter's Python type hint (e.g., \"str\")."
                    },
                    "description": {
                      "type": "string",
                      "description": "A description for the argument."
                    }
                  },
                  "required": ["name", "python_type", "description"]
                }
              },
              "run_method_logic": {
                "type": "string",
                "description": "The explanation and requirements for the Python code for the `_run` method."
              }
            },
            "required": ["class_name", "name_attribute", "description_attribute", "run_method_parameters", "run_method_logic"]
          }
        },
        "required": ["design_metadata", "class_definition"]
      }
    }
  },
  "required": ["custom_tools"]
}
```
