
* **Instruction:** Only use the previouly generated document as a source of truth.
* **Objective:** Your task is to generate the complete definition for any custom tools that were identified in the tool selection plan.
* **Output Structure:** The output should be a JSON object with a single key: `custom_tools`.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.

---

**'Custom-Tool-Generation-Plan' - JSON Schema:**

*   `custom_tools` (Array of Objects): A list of custom tool definitions, used only when `is_custom_tool` is `True`.
    *   `design_metadata` (Object):
        * `tool_id` (String): The current design_metadata.tool_id.
        * `description` (String): A detailed description of the tool's function to better orient its development in pyhton, including the output.
    * `class_definition` (Object): Defines the necessary arguments for generating the custom tool's class structure.
        * `class_name` (String): The Python class name.
        * `name_attribute` (String): The value for the tool's `name` attribute.
        * `description_attribute` (String): The value for the tool's `description` attribute.
        * `run_method_parameters` (Array of Objects): Defines the parameters for the tool's `_run` method.
            * `name` (String): The parameter's name (e.g., "url").
            * `python_type` (String): The parameter's Python type hint (e.g., "str").
            * `description` (String): A description for the argument.
        * `run_method_logic` (String): The explanation and requirements for the Python code for the `_run` method.
