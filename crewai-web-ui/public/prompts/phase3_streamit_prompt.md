
You will be provided with the content of previous phases, including the JSON definition of agents, tasks, and user inputs. Your task is to generate the content for a `streamit.py` file that serves as a Streamlit UI for the CrewAI project.

**Objective:**
Generate a Python script that uses Streamlit to create a user interface. The script must dynamically create input fields based on the `user_inputs` defined in the provided JSON and execute the crew.

**Constraints:**
*   **Output ONLY Python code.** No markdown formatting, no explanation, no prologue, no epilogue.
*   The file must be valid, executable Python code.

### 1. UI Design
* **Layout Definition**: Parse the YAML `description` attribute to define the basic UI layout.
* **Input Generation**: Scan the provided JSON for the `user_inputs` list.
* For each item in `user_inputs`, generate a corresponding Streamlit input widget (e.g., `st.text_input`).
* Use the `name` field as the widget label and unique key.
* Store all collected values in a dictionary named `inputs`.
* **Output Management**:
* Iterate through the defined outputs in the YAML file.
* **File-based Outputs** (have a `location` or `file` path):
    * Display the file path in the UI.
    * Implement a **background monitoring process** to check for file availability in real-time.
    * Include a **status indicator** (Available/Pending) for each file.
* **Direct Outputs** (NO `location` or `file` path):
    * These represent the direct result of the crew execution (the return value of `crew.kickoff()`).
    * Display them ONLY after the execution completes successfully.
* **Common Rendering Logic** (for both types):
    * Use the **`description`** field to display a helper text or caption (e.g., `st.caption` or `st.info`).
    * Use the **`format`** field to determine how to render the content:
        * **JSON**: Use `st.json()` (parse string content if needed).
        * **Markdown**: Use `st.markdown()`.
        * **Image**: Use `st.image()`.
        * **String** / **Text**: Use `st.text()` or `st.write()`.
* Provide a direct link or interface to open/access file-based outputs through the Streamlit server once they exist.
* Provide a direct link or interface to open/access files through the Streamlit server once they exist.
* Include a **status indicator** (Available/Pending) for each file and a **Delete** button that appears once the file is generated.

### 2. Execution Logic
* **Initialization**: Import `CrewaiGenerated` from `crewai_generated.crew`.
* **Trigger**: Upon clicking the **"Run Crew"** button:
* **Instantiation**: Initialize the crew using `crew_instance = CrewaiGenerated().crew()`.
* **State Persistence**: Save the `inputs` dictionary to `inputs.json`. On subsequent loads, the UI should read this file to pre-populate input fields with previous values.
* **Execution**: Invoke the crew using `result = crew_instance.kickoff(inputs=inputs)` exclude the current `execution_log.json`.
* **Handling Direct Outputs**:
    * If an output definition has NO `location`, extract its content from the `result` object (or use `result` directly if it matches the format).
    * Display these outputs immediately after execution finishes.
* **Runtime Monitoring**:
* Provide an **Interrupt** button to allow users to stop the crew execution mid-process called "Stop Crew" killing the current running of crew_instance.
* **Completion**:
* Upon successful completion, display a success message.

### 3. Environment & Path Handling
* **Compatibility**: Implement fallback import logic to ensure the application runs seamlessly in both local development environments and as an installed Docker package.

**Template:**

```python
import streamlit as st
import sys
import os

# Adjust import based on the actual package structure if needed
try:
    from crewai_generated.crew import CrewaiGenerated
except ImportError:
    # Fallback for local development if not installed as package
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from crewai_generated.crew import CrewaiGenerated

crew = CrewaiGenerated().crew()

def main():

    inputs = {}


if __name__ == "__main__":
    main()
```
