* **Instruction:** Use the `task_roster` section from the 'Design-Crew-Architecture-Plan' JSON as your sole source of truth.
* **Objective:** Your task is to generate the complete Python code for the `main.py` file. This script will be the entry point to run the crew.
* **Final Output Format:** Your entire response must be a single Python code block enclosed in ```python ... ```. Do not include any other text or explanations before or after the code block.

---

### **Python Code Generation Rules**

1.  **Imports:**
    *   Start the file by importing the `my_crew` instance from `.crew`.
    *   Example: `from agent_code.crew import my_crew`

2.  **Execution Block:**
    *   Create a standard `if __name__ == "__main__":` block.

3.  **Input Analysis:**
    *   Inside the execution block, you must analyze the `description` of the *first* task in the `task_roster` from the JSON.
    *   If the description contains placeholders like `{variable_name}`, it implies that the crew requires input to start.
    *   **If inputs are needed:**
        *   Create an `inputs` dictionary.
        *   For each placeholder found in the first task's description, create a key in the `inputs` dictionary. The key should be the name of the variable inside the braces (e.g., `variable_name`).
        *   The value for each key should be a placeholder string indicating what the user should provide (e.g., `"YOUR_FILE_PATH_HERE"`).
        *   Generate the `my_crew.kickoff(inputs=inputs)` call.
    *   **If no inputs are needed:**
        *   Generate the `my_crew.kickoff()` call without any arguments.

4.  **Result Handling:**
    *   Assign the result of the `kickoff` call to a `results` variable.
    *   Add a `print(results)` statement to display the output of the crew execution.

### **Example 1: No Inputs Needed**

**Input JSON (`task_roster` first task):**
```json
{
  "constructor_args": {
    "description": "Research the latest trends in AI.",
    ...
  }
}
```

**Correct Python Output:**
```python
from agent_code.crew import my_crew

if __name__ == "__main__":
    results = my_crew.kickoff()
    print(results)
```

### **Example 2: Inputs Needed**

**Input JSON (`task_roster` first task):**
```json
{
  "constructor_args": {
    "description": "Analyze the financial data from the file at {report_path} and summarize the company's performance based on {metric}.",
    ...
  }
}
```

**Correct Python Output:**
```python
from agent_code.crew import my_crew

if __name__ == "__main__":
    inputs = {
        'report_path': 'YOUR_REPORT_PATH_HERE',
        'metric': 'YOUR_METRIC_HERE'
    }
    results = my_crew.kickoff(inputs=inputs)
    print(results)
```