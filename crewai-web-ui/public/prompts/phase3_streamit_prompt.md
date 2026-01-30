
You are an expert Python Streamlit Developer. Your task is to generate a `streamit.py` file that serves as a modern, functional User Interface for a CrewAI project.

# Context
The user has defined a CrewAI project with specific agents, tasks, and **User Inputs**. You will be provided with this definition in JSON format.
Your goal is to build a UI that allows users to:
1.  Enter values for the defined User Inputs.
2.  Run the Crew.
3.  View the outputs (both generated files and direct execution results).

# Task Requirements

Generate a valid, executable Python script (`streamit.py`) that implements the following logic:

## 1. Dynamic Input Form
*   **Analyze the `user_inputs` list** from the provided JSON.
*   **Loop through each input** and create a corresponding Streamlit widget:
    *   Use `st.text_input` as the default.
    *   Use the input's `name` as the label.
    *   Use the input's `name` as the key for state management.
*   **Store** all user-entered values in a dictionary named `inputs`.

## 2. Crew Execution
*   **Import** the crew class: `from crewai_generated.crew import CrewaiGenerated`.
*   **Initialize** the crew: `crew_instance = CrewaiGenerated().crew()`.
*   **Button**: Create a `st.button("Run Crew")` that is only visible if the crew is not running.
*   **On Click**:
    1.  **Save Inputs**: Dump the `inputs` dictionary to a local file named `inputs.json` (for persistence).
    2.  **Execute**:
        *   Use a **Status Container** (e.g., `with st.status("Running Crew...", expanded=True) as status:`) to show progress.
        *   Wrap the execution in a `try...except` block.
        *   **Running**: Update status to "Running".
        *   **Invocation**: Call `result = crew_instance.kickoff(inputs=inputs)`.
        *   **Success**: Update status to "Complete" (e.g., `status.update(label="Crew Execution Complete", state="complete")`).
        *   **Failure**: Catch exceptions, display an error message (`st.error(f"Error: {e}")`), and update status to "Error" (`status.update(label="Execution Failed", state="error")`).
    3.  **Handle Results**: Display outputs immediately after execution (see "Output Handling").

    *   **Interrupt**: Add a `stop_btn = st.button("Stop Execution")` (if appropriate for the layout) that simply calls `st.stop()` or resets state to halt the process if clicked (note: valid for script re-runs, though acting on blocking calls varies). ensure the UI reflects the "Stopped" state if interrupted. It should only be visible if the crew is running.

## 3. Output Handling (CRITICAL)
You must handle two types of outputs defined in the configuration. Iterate through the `outputs` list:

### Type A: File-based Outputs
*   **Definition**: Outputs that have a `location` (or `file`) path specified.
*   **Behavior**: These files are generated *during* or *after* execution by the agents.
*   **UI Elements**:
    *   Display the **File Path**.
    *   Show a **Status Indicator** (e.g., "Pending" vs "Available").
    *   Implement a **Background Monitor** to check if the file exists on disk.
    *   Provide a **Preview/Open** button once the file exists.

### Type B: Direct Execution Results
*   **Definition**: Outputs that **DO NOT** have a `location` path.
*   **Behavior**: These are returned directly by the `crew.kickoff()` method (wrapped in the `result` object).
*   **UI Elements**:
    *   Display these **ONLY** after execution completes successfully.
    *   Use the `result` variable to extract the content.

### Rendering Rules (For Both Types)
Use the `format` and `description` fields to determine how to render the content:
*   **Description**: Display as a caption or help text (`st.caption(description)`).
*   **Format**:
    *   `"JSON"` -> `st.json(content)`
    *   `"Markdown"` -> `st.markdown(content)`
    *   `"Image"` -> `st.image(content)`
    *   Everything else -> `st.write()` or `st.text()`

## 4. State & Persistence
*   **Load Inputs**: On script launch, check if `inputs.json` exists. If so, pre-fill the input widgets with the saved values.
*   **Stop Button**: detailed instructions to add a "Stop" button are NOT required for this version, but standard Streamlit structure should allow for future expansion.

# Constraints
*   **Output ONLY Python code.** No markdown blocks, no explanations.
*   **Compatibility**: Include the standard boilerplate to handle imports for both local development (running `streamlit run streamit.py`) and installed package mode. (See Template).

# Template
Use this structure as a starting point:

```python
import streamlit as st
import sys
import os
import json
import time

# --- Path Setup ---
try:
    from crewai_generated.crew import CrewaiGenerated
except ImportError:
    # Fallback for local dev
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from crewai_generated.crew import CrewaiGenerated

def load_inputs():
    if os.path.exists('inputs.json'):
        with open('inputs.json', 'r') as f:
            return json.load(f)
    return {}

def main():
    st.title("CrewAI Dashboard")
    
    # ... [Your Dynamic Input Logic Here] ...
    
    if st.button("Run Crew"):
        # ... [Execution Logic] ...
        # ... [Output Display Logic] ...

if __name__ == "__main__":
    main()
```
