
Use the JSON object provided as the single source of truth. Your task is to generate the content for any custom tool files.

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
    *   The output should be a series of file blocks, each marked with `[START_FILE:FILE_PATH]` and `[END_FILE:FILE_PATH]`.
    *   If there are no custom tools, the output should be empty.

**Expected Output:**

[START_FILE:src/crewai_generated/tools/perform_sentiment_analysis.py]
from typing import Any
from crewai.tools import BaseTool

class CustomSentimentAnalyzerTool(BaseTool):
    name: str = "perform_sentiment_analysis"
    description: str = "Analyzes the sentiment of a given text and returns a label (Positive, Negative, Neutral) with confidence score."

    def _run(self, text: str) -> str:
        """
        Analyzes the sentiment of the input text.
        """
        # Task Use Case: Input: article summary text. Expected output: sentiment label and confidence score. This is critical for assessing market impact.
        
        # Implementation logic based on run_method_logic...
        # ...
        return "Sentiment: Positive, Confidence: 0.9"
[END_FILE:src/crewai_generated/tools/perform_sentiment_analysis.py]
