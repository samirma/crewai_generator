
Use the JSON object provided as the single source of truth. Your task is to generate the content for any custom tool files.

*   **Handling Empty Input:**
    *   If the `custom_tools` list in the provided JSON is empty (e.g., ``), you **MUST NOT** generate any output. Return an empty string or simply no `[START_FILE]` blocks.

*   **Objective:** Iterate through the `custom_tools` list in the provided JSON.
*   **File Naming:** The file name should be the `design_metadata.tool_id` (ensure it is a valid filename, e.g., snake_case), located in `src/crewai_generated/tools/`.
*   **File Content:**
    *   **Imports:** Always import `from crewai.tools import BaseTool` and any necessary types from `typing`.
    *   **Class Definition:**
        *   Class name: Use `class_definition.class_name`.
        *   Inheritance: Inherit from `BaseTool`.
        *   Attributes:
            *   `name`: Use `class_definition.name_attribute`.
            *   `description`: Use `class_definition.description_attribute`.
    *   **Method `_run`:**
        *   Arguments: Generate from `class_definition.run_method_parameters`. Use `name` and `python_type` for the signature.
        *   Return Type: Always `str`.
        *   Body: Implement the logic described in `class_definition.run_method_logic`.
    *   **Context:** Add a comment block inside the method or class documentation citing the `design_metadata.task_use_case` to clarify intent.

*   **Output Format:**
    *   The output should be a series of file blocks, each marked with `[START_FILE:FILE_PATH]` and `[END_FILE:FILE_PATH]`. Returns nothing in case no code should be developed.

**EXAMPLE of expected output format (Do NOT copy valid usage, structure ONLY):**

[START_FILE:src/crewai_generated/tools/design_metadata.tool_id.py]
from crewai.tools import BaseTool

class ClassName(BaseTool):
    name: str = "Name Attribute"
    description: str = "Description Attribute"

    def _run(self, argument: str) -> str:
        # Implementation logic
        return "Result"
[END_FILE:src/crewai_generated/tools/design_metadata.tool_id.py]
