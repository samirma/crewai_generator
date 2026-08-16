
Use the JSON object provided as the single source of truth. Your task is to generate the content for any custom tool files.

*   **Handling Empty Input:**
    *   If the `custom_tools` list in the provided JSON is empty (e.g., ``), you **MUST NOT** generate any output. Return an empty string or simply no `[START_FILE]` blocks.

*   **Objective:** Iterate through the `custom_tools` list in the provided JSON.
*   **File Naming:** The file name is the actual value of `design_metadata.tool_id` (a valid snake_case filename), located in `src/crewai_generated/tools/`. Example: if `tool_id` is `perform_sentiment_analysis`, the path is `src/crewai_generated/tools/perform_sentiment_analysis.py` — substitute the real value, never write the literal token `design_metadata.tool_id`.
*   **File Content:**
    *   **Imports:** Always import `from crewai.tools import BaseTool`, `from pydantic import BaseModel, Field`, and `from typing import Type` (plus any other needed types).
    *   **Input Schema (args_schema):** For each tool, define a pydantic input model named `<ClassName>Input(BaseModel)` with one field per entry in `class_definition.run_method_parameters`, using `name`, `python_type`, and `description` (as `Field(..., description=...)`).
    *   **Class Definition:**
        *   Class name: Use the EXACT value of `class_definition.class_name`, byte-for-byte. NEVER rename, "fix", or normalize it (e.g. do NOT turn `HtmlReportValidationTool` into `HtmlReportValidatorTool`), even if it reads awkwardly or is inconsistent with `tool_id`. The crew file is generated separately from the same JSON and imports this class by that exact name — any deviation causes an ImportError at runtime.
        *   Inheritance: Inherit from `BaseTool`.
        *   Attributes:
            *   `name`: Use `class_definition.name_attribute`.
            *   `description`: Use `class_definition.description_attribute`.
            *   `args_schema`: `Type[BaseModel] = <ClassName>Input`.
    *   **Method `_run`:**
        *   Arguments: Generate from `class_definition.run_method_parameters`. Use `name` and `python_type` for the signature.
        *   Return Type: Always `str`.
        *   Body: Implement the logic described in `class_definition.run_method_logic`.
    *   **Context:** Add a comment block inside the method or class documentation citing the `design_metadata.task_use_case` to clarify intent.
*   **Package init:** Whenever at least one tool is generated, ALSO emit a block for `src/crewai_generated/tools/__init__.py` containing only a docstring (e.g., `"""Custom tools."""`).

*   **Output Format (STRICT):**
    *   The output is a series of file blocks, each marked with `[START_FILE:FILE_PATH]` and `[END_FILE:FILE_PATH]`.
    *   The FILE_PATH in the END marker must be byte-identical to the one in the START marker.
    *   File content starts on the line immediately AFTER `[START_FILE:...]` — never on the same line.
    *   No text outside the blocks. No markdown code fences inside the blocks.
    *   If no code should be developed, return nothing at all.

**EXAMPLE of expected output format (structure only — substitute real values):**

[START_FILE:src/crewai_generated/tools/perform_sentiment_analysis.py]
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class CustomSentimentAnalyzerToolInput(BaseModel):
    """Input schema for CustomSentimentAnalyzerTool."""
    text: str = Field(..., description="The text to analyze.")


class CustomSentimentAnalyzerTool(BaseTool):
    name: str = "Sentiment Analyzer"
    description: str = "Analyzes the sentiment of the given text and returns a score."
    args_schema: Type[BaseModel] = CustomSentimentAnalyzerToolInput

    def _run(self, text: str) -> str:
        # Task use case: score news headlines for market sentiment.
        # Implementation logic
        return "Result"
[END_FILE:src/crewai_generated/tools/perform_sentiment_analysis.py]
[START_FILE:src/crewai_generated/tools/__init__.py]
"""Custom tools."""
[END_FILE:src/crewai_generated/tools/__init__.py]
