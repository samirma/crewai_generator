* **Instruction:** Use the `custom_tool_definitions` section from the 'Design-Crew-Architecture-Plan' JSON as your sole source of truth.
* **Objective:** Your task is to generate the complete Python code for a `custom_tools.py` file. This file will contain all custom tool classes required by the crew.
* **Conditional Generation:** If the `custom_tool_definitions` array is empty, you should output nothing.
* **Final Output Format:** Your entire response must be a single Python code block enclosed in ```python ... ```. Do not include any other text or explanations before or after the code block.

---

### **Python Code Generation Rules**

1.  **Imports:**
    *   Start the file with the necessary imports: `from crewai.tools import BaseTool` and any other required types like `List` from `typing`.

2.  **Class Definition:**
    *   Iterate through each object in the `custom_tool_definitions` array.
    *   For each object, generate a Python class that inherits from `BaseTool`.
    *   The class name MUST be derived from the `name_attribute` in `class_definition_args`. Convert the `name_attribute` string (e.g., "Web Page Scraper") into a valid PascalCase class name (e.g., `WebPageScraperTool`).

3.  **Class Attributes:**
    *   Inside the class, define two class-level attributes:
        *   `name`: Set its value to the `name_attribute` string from the JSON.
        *   `description`: Set its value to the `description_attribute` string from the JSON.

4.  **`_run` Method:**
    *   Define a method `def _run(self, ...):`.
    *   The parameters for this method MUST be generated from the `run_method_parameters` array in the JSON.
    *   For each parameter object, add an argument to the method signature with its `name` and `python_type` hint.
    *   The docstring for the `_run` method should describe its purpose.
    *   The body of the `_run` method MUST be the `run_method_logic` string from the JSON.

### **Example**

**Input JSON (`custom_tool_definitions` section):**
```json
[
  {
    "class_definition_args": {
      "name_attribute": "Website Content Scraper",
      "description_attribute": "Scrapes the full content of a given URL.",
      "run_method_parameters": [
        {
          "name": "url",
          "python_type": "str",
          "description": "The URL to scrape."
        }
      ],
      "run_method_logic": "import requests\nreturn requests.get(url).text"
    }
  }
]
```

**Correct Python Output:**
```python
from crewai.tools import BaseTool
from typing import List

class WebsiteContentScraperTool(BaseTool):
    name: str = "Website Content Scraper"
    description: str = "Scrapes the full content of a given URL."

    def _run(self, url: str) -> str:
        """Scrapes the text content of a single URL."""
        import requests
        return requests.get(url).text
```