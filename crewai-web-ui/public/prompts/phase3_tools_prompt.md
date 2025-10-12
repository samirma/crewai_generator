**Custom Tools Generation Logic:**

Use the JSON object provided as the single source of truth. Your task is to generate the content for any custom tool files.

*   **Objective:** If the `tool_repository` list in the JSON input is not empty, iterate through it and generate a Python file for each custom tool wich has attribute "is_custom_tool" set to true.
*   **File Naming:** The name of each file should be derived from the `class_name` in the custom tool definition, converted to snake_case. For example, a class named `MyCustomTool` should be in a file named `my_custom_tool.py`.
*   **File Content:**
    *   Each file should contain the Python code for the custom tool, as defined in the `code` property of the custom tool definition.
    *   The code should be a valid Python script, defining a class that inherits from `BaseTool`.
*   **Output Format:**
    *   The output should be a series of file blocks, each marked with `[START_FILE:FILE_PATH]` and `[END_FILE:FILE_PATH]`. The `FILE_PATH` should be `src/crewai_generated/tools/<file_name>.py`.
    *   If there are no custom tools, the output should be empty.

**Example Input JSON Snippet (`custom_tool_definitions`):**

```json
  "tool_repository": [
    {
      "design_metadata": {
        "required_functionality": "Make HTTP GET requests to a specified URL and return the JSON response.",
        "crewai_tool_evaluation": [
          {
            "tool_selection_justification": "Neither `crewai_tools` nor the provided MCP servers offer a generic HTTP GET request tool that can fetch JSON from an arbitrary API endpoint. `ScrapeWebsiteTool` is for HTML scraping, `mcp-local-seaxng` is for web search, and other tools are for file operations or specific data formats. Therefore, a custom tool is necessary to fulfill the core requirement of making API calls as specified in the blueprint.",
            "is_valid_availiable_tool": false,
            "tool_name": "N/A"
          }
        ],
        "is_custom_tool": true,
        "is_custom_embedding_supported": false
      },
      "constructor_args": {
        "tool_id": "api_call_tool",
        "class_name": "APICallTool",
        "initialization_params": {}
      }
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