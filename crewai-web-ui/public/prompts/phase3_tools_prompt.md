**Custom Tools Generation Logic:**

Use the JSON object provided as the single source of truth. Your task is to generate the content for any custom tool files.

*   **Objective:** Iterate through task_roster[*].design_metadata.tools[*].custom_tool.
*   **File Naming:** File Naming: Derived from custom_tool.tool_id in lowcase
*   **File Content:**
    *   Each file should contain the Python code for the custom tool, as defined in the `code` property of the custom tool definition.
    *   The code should be a valid Python script, defining a class that inherits from `crewai.tools import BaseTool`.
*   **Output Format:**
    *   The output should be a series of file blocks, each marked with `[START_FILE:FILE_PATH]` and `[END_FILE:FILE_PATH]`. The `FILE_PATH` should be `src/crewai_generated/tools/<file_name>.py`.
    *   If there are no custom tools, the output should be empty.
    *   Each file block should implement a fully working python code that follow run_method_logic and description of the current tool.

**Expected Output:**


[START_FILE:src/crewai_generated/tools/tool_id.py]
# BaseTool should be alwys imported from crewai.tools
from crewai.tools import BaseTool

class MyCustomTool(BaseTool):
    name: str = "My Custom Tool"
    description: str = "A custom tool that does something."

    def _run(self, argument: str) -> str:
        Insert the python code here
[END_FILE:src/crewai_generated/tools/tool_id.py]
