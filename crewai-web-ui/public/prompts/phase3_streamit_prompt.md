
You will be provided with the content of previous phases, including the JSON definition of agents, tasks, and user inputs. Your task is to generate the content for a `streamit.py` file that serves as a Streamlit UI for the CrewAI project.

**Objective:**
Generate a Python script that uses Streamlit to create a user interface. The script must dynamically create input fields based on the `user_inputs` defined in the provided JSON and execute the crew.

**Constraints:**
*   **Output ONLY Python code.** No markdown formatting, no explanation, no prologue, no epilogue.
*   The file must be valid, executable Python code.

**Logic:**
1.  **Inputs**: Check the provided JSON for a `user_inputs` list.
    *   For each item in `user_inputs`, generate a Streamlit input widget (e.g., `st.text_input`).
    *   Use the `name` of the input as the label and key.
    *   Store the values in a dictionary named `inputs`.
2.  **Execution**:
    *   Import `CrewaiGenerated` from `crewai_generated.crew`.
    *   When the user clicks a "Run Crew" button:
        *   Instantiate the crew: `crew_instance = CrewaiGenerated().crew()`
        *   Run the crew: `result = crew_instance.kickoff(inputs=inputs)`
        *   Display `result` using `st.markdown` or `st.write`.
3.  **Docker/Path Handling**:
    *   Include the fallback import logic for local development vs installed package.

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

def main():
    st.set_page_config(page_title="CrewAI Runner", layout="wide")
    st.title("🤖 CrewAI Agent Runner")

    with st.sidebar:
        st.header("Configuration")
        st.info("Configure your agents and tasks settings here.")

    st.subheader("Run Execution")

    inputs = {}
    
    # GENERATE INPUT WIDGETS HERE BASED ON JSON 'user_inputs'
    # Example logic (DO NOT COPY LINK, IMPLEMENT DYNAMICALLY):
    # inputs['topic'] = st.text_input("topic", "AI LLMs")
    
    if st.button("🚀 Run Crew"):
        with st.spinner("Agents are working..."):
            try:
                crew = CrewaiGenerated().crew()
                result = crew.kickoff(inputs=inputs)
                st.success("Execution Complete!")
                st.markdown("### Results:")
                st.markdown(result)
            except Exception as e:
                st.error(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
```
