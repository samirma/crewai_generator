**`main.py` Generation Logic:**

Use the JSON object provided as the single source of truth. Your task is to generate the content for the `main.py` file, which serves as the entry point for the CrewAI project.

*   **Objective:** Create a simple Python script that imports the `CrewaiGenerated` class and kicks off the crew.
*   **Content:**
    *   Import the `CrewaiGenerated` class from the `crew` module.
    *   Instantiate the `CrewaiGenerated` class.
    *   Call the `crew()` method on the instance to get the crew object.
    *   Call the `kickoff()` method on the crew object to start the execution.
*   **Formatting:**
    *   The output should be a single, valid Python script.

**Example `main.py` Output:**

```python
from crew import CrewaiGenerated

if __name__ == "__main__":
    crew = CrewaiGenerated().crew()
    crew.kickoff()
```