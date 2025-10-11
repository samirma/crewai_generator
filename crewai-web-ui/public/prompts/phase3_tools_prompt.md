**Custom Tools Generation Logic:**

Use the JSON object provided as the single source of truth. Your task is to generate the content for any custom tool files.

*   **Objective:** If the `custom_tool_definitions` list in the JSON input is not empty, iterate through it and generate a Python file for each custom tool.
*   **File Naming:** The name of each file should be derived from the `class_name` in the custom tool definition, converted to snake_case. For example, a class named `MyCustomTool` should be in a file named `my_custom_tool.py`.
*   **File Content:**
    *   Each file should contain the Python code for the custom tool, as defined in the `code` property of the custom tool definition.
    *   The code should be a valid Python script, defining a class that inherits from `BaseTool`.
*   **Output Format:**
    *   The output should be a series of file blocks, each marked with `[START_FILE:FILE_PATH]` and `[END_FILE:FILE_PATH]`. The `FILE_PATH` should be `src/crewai_generated/tools/<file_name>.py`.
    *   If there are no custom tools, the output should be empty.

**Example Input JSON Snippet (`custom_tool_definitions`):**

```json
"custom_tool_definitions": [
  {
    "class_name": "MyCustomTool",
    "code": "from crewai.tools import BaseTool\n\nclass MyCustomTool(BaseTool):\n    name: str = \"My Custom Tool\"\n    description: str = \"A custom tool that does something.\"\n\n    def _run(self, argument: str) -> str:\n        return f\"The custom tool received: {argument}\""
  }
]
```

**Expected Output:**

```
[START_FILE:src/crewai_generated/tools/my_custom_tool.py]
from crewai.tools import BaseTool

class MyCustomTool(BaseTool):
    name: str = "My Custom Tool"
    description: str = "A custom tool that does something."

    def _run(self, argument: str) -> str:
        return f"The custom tool received: {argument}"
[END_FILE:src/crewai_generated/tools/my_custom_tool.py]
```