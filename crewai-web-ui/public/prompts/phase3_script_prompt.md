## Phase 3: Construct Python Script

**Input:** The **complete 'Design-Crew-Architecture-Plan' document** generated in Phase 2. No other information source should be used.

**Process:** Construct the Python script by meticulously implementing all specifications, configurations, and logic detailed in the **entirety of the 'Design-Crew-Architecture-Plan' input document**.

**Output:** The final, runnable CrewAI Python script.

**Script Structure & Content Requirements:**

**Environment Setup (Order is CRITICAL):**
```python
import os
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv()) # MUST BE CALLED EARLY
```

**Core Imports:**
```python
from crewai import LLM, Agent, Task, Crew, Process
# Import ALL specific standard tools used (e.g., from crewai_tools) based on 'tool_type' in Section C of the Plan
# Example: from crewai_tools import SerperDevTool, WebsiteSearchTool, FileWriterTool, FileReadTool, PDFSearchTool
# Import BaseTool if any custom tools are defined in Section D of the Plan
# from crewai.tools import BaseTool
# Import Pydantic BaseModel if any Pydantic models are defined in Section F of the Plan
# from pydantic import BaseModel
```
*(The AI generating the script **MUST** uncomment `BaseTool`, `BaseModel`, and specific tool imports only if they are needed based on the Design-Crew-Architecture-Plan).*

**API Key Access:**
*   Method: Use `os.getenv("YOUR_API_KEY_NAME")` for ALL API keys, where "YOUR_API_KEY_NAME" is derived from `api_key` fields in the 'Design-Crew-Architecture-Plan'.
*   Constraint: **NO HARDCODED SECRETS.**

**LLM Instantiation:**
*   Instantiate LLM objects as defined in the 'Design-Crew-Architecture-Plan' (Section B: Agent Cadre - LLM Specification, and Section A for `manager_llm` if applicable).
*   Use the `model`, `temperature` (must be 0.0), `api_key` (obtained via `os.getenv` using the specified `api_key`), `config_params`, and `multimodal` settings from the Plan.
*   Constraint: `temperature=0.0` for ALL instances.
*   Constraint: Use ONLY approved LLMs for Agent/Manager roles.
*   **Approved LLM List:**
    *   `gemini/gemini-2.5-flash-preview-05-20`
    *   `gemini/gemini-2.5-pro-preview-05-06`
    *   `deepseek/deepseek-chat`
*   Example:
    ```python
    # llm_gemini_flash = LLM(
    #     model="gemini/gemini-2.5-flash-preview-05-20", # From Plan
    #     temperature=0.0,
    #     api_key=os.getenv("GOOGLE_API_KEY"), # "GOOGLE_API_KEY" from Plan's api_key
    #     # multimodal=True # If True in Plan's LLM Specification
    #     # config_params={'base_url': '...'} # If in Plan's LLM Specification
    # )
    ```

**Custom Tool & Pydantic Model Definitions (If applicable):**
*   If 'Custom Tool Definitions' (Section D) or 'Structured Data Handling' (Section F with "Yes" for Usage) are present in the 'Design-Crew-Architecture-Plan':
    *   Implement Python class definitions for ALL custom tools from Section D, using their `class_name`, `tool_name_attr`, `description_attr`, `args_schema_class_name` (if any), `_run_method_signature`, and `_run_method_logic_description`.
        *   **CRITICAL**: Include the `justification_for_custom_tool` (from Section D of the Plan) as a prominent comment within or above each custom tool class definition.
        *   Implement basic `try-except` blocks within custom tool `_run` methods for robustness, based on `_run_method_logic_description`.
    *   Implement Pydantic model class definitions specified in Section F of the Plan.

**Tool Instantiation:**
*   Instantiate ALL tools based on the 'Tool Configuration Repository' (Section C) from the 'Design-Crew-Architecture-Plan'.
*   For each entry in Section C:
    *   Use the `config_id` as the Python variable name for the tool instance.
    *   Use `tool_type` to determine the class to instantiate (e.g., `SerperDevTool`, or a custom tool `class_name` from Section D).
    *   Use `initialization_params` for instantiation arguments. This includes any RAG `config` dictionaries.
    *   Ensure API keys within `initialization_params` are fetched using `os.getenv()`.
    *   Ensure LLMs within RAG `config` also have `temperature=0.0` and use `multimodal` settings if specified in the Plan for that RAG LLM.

**Agent Definitions:**
*   Define agents as per 'Agent Cadre' (Section B) in the 'Design-Crew-Architecture-Plan'.
*   Instantiate agents using their `Role`, `Goal`, `Backstory`.
*   Assign the correct LLM instance (instantiated earlier) based on the `LLM Specification` for that agent.
*   The `tools` list for an agent **MUST** be a list of tool *instances* (instantiated in the previous step). To compile this list:
    1.  Identify all tasks assigned to this agent from the 'Task Roster' (Section E of the Plan).
    2.  For these tasks, collect all unique `config_id`s listed in their 'Enabling Tool(s)'.
    3.  Map these `config_id`s to the corresponding tool instances created during 'Tool Instantiation'.
*   `verbose=True` is **MANDATORY**.
*   Set `allow_delegation` based on the value specified in the Plan for that agent.

**Task Definitions:**
*   Define tasks as per 'Task Roster' (Section E) in the 'Design-Crew-Architecture-Plan', using their `Task Identifier` as the Python variable name.
*   Use the task `Description`.
*   Assign the agent instance that matches the `Assigned Agent Role`.
*   The `tools` parameter for each Task **MUST** be a list of specific tool INSTANCES (instantiated earlier). These instances correspond to the `config_id`(s) listed in that task's 'Enabling Tool(s)' in the Plan.
*   If `Context` is specified, ensure the task objects (Python variables) are correctly passed.
*   If the task's `Expected Output` in the Plan specifies a filename (e.g., for a deliverable), ensure the task is configured to produce this (e.g., by ensuring one of its tools, like a `FileWriterTool` referenced by its `config_id`, is initialized with or receives the filename).
*   If `output_pydantic_model` is specified in the Plan for this task (Section E), set the `output_pydantic` parameter of the Task to the corresponding Pydantic class (defined earlier).

**Crew Assembly:**
*   Create the Crew instance.
*   `agents=[...]`: List of instantiated agent objects.
*   `tasks=[...]`: List of instantiated task objects.
*   `process`: Set to `Process.sequential` or `Process.hierarchical` as defined in the 'Design-Crew-Architecture-Plan' (Section A).
*   `memory`: Set to `True` or `False` based on 'Crew Memory' activation (Section G of the Plan).
*   `embedder`: If memory is active, use the `embedder` configuration dictionary specified in Section H of the Plan.
*   `manager_llm`: If `Process.hierarchical`, assign the instantiated manager LLM object, as specified in Section A of the Plan.
*   `verbose=True` is **MANDATORY**.

**Execution Block:**
```python
if __name__ == "__main__":
    print("## Initializing Crew...")
    # inputs_dict = {"example_key": "example_value"} # Define if kickoff requires inputs, based on Blueprint/Plan
    # results = your_crew_instance.kickoff(inputs=inputs_dict)
    results = your_crew_instance.kickoff() # Use if no dynamic inputs specified in Plan
    print("\n## Crew Operation Complete.")
    print("Final Results:")
    print(results) # This will print the raw output of the last task, or structured data if Pydantic was used.

    # Example for checking a file deliverable (adapt based on Plan's deliverable spec):
    # final_deliverable_filename = "output_report.md" # Get this from the Plan if specified
    # if final_deliverable_filename and os.path.exists(final_deliverable_filename):
    #    print(f"\nDeliverable '{final_deliverable_filename}' generated at: {os.path.abspath(final_deliverable_filename)}")
    #    # Optionally, print file content if it's text-based and small
    #    # with open(final_deliverable_filename, 'r') as f:
    #    #     print("\n--- File Content ---")
    #    #     print(f.read())
    #    #     print("--- End of File Content ---")
    # elif final_deliverable_filename:
    #    print(f"\nDeliverable file '{final_deliverable_filename}' was expected but not found. Review task outputs in 'results'.")

```

**Internal Review Checklist (Phase 3 Self-Correction - Perform before finalizing script):**
*   **Plan Adherence:** Does the script accurately implement ALL specifications from the 'Design-Crew-Architecture-Plan' (LLMs, tools, agents, tasks, process, memory, Pydantic models, custom tool logic, RAG configs)?
*   **Python Syntax & Imports:** Is the script syntactically correct Python 3? Are all necessary modules imported (e.g., `BaseTool`, `BaseModel` *only if used*, specific `crewai_tools` as per Plan)? Run a linter or syntax check if possible.
*   **Environment & API Keys:** Is `load_dotenv(find_dotenv())` called at the very beginning? Are all API keys accessed via `os.getenv()` using correct environment variable names from the Plan? **VERIFY NO HARDCODED SECRETS.**
*   **LLM Configuration:** Are all LLM instances (agents, manager, RAG LLMs) configured with `temperature=0.0` and correct models, API keys, `config_params`, and `multimodal` settings as per the Plan?
*   **Tool Instantiation & Configuration:** Are all tools instantiated correctly with parameters from the 'Tool Configuration Repository' (Section C of Plan), including RAG `config` dictionaries? Are tool instances correctly assigned to Python variables matching `config_id`?
*   **Custom Tools & Pydantic:** If defined in the Plan, are custom tool classes implemented with correct signatures, logic (from `_run_method_logic_description`), `args_schema`? Is the `justification_for_custom_tool` included as a comment? Are Pydantic models defined correctly?
*   **Agent Configuration:** Are agents defined with correct roles, goals, backstories, LLMs, `verbose=True`, `allow_delegation`? Is their `tools` list correctly compiled from assigned tasks' `config_id`s (mapping to tool instances)?
*   **Task Configuration:** Are tasks defined with correct descriptions, agents, and contexts? Is the `tools` list for each task correctly populated with tool *instances*? Is `output_pydantic` set to the Pydantic class if specified in the Plan?
*   **Crew Assembly:** Is the Crew object assembled with the correct agents, tasks, process, memory settings (including embedder if applicable), and manager LLM (if hierarchical)? Is `verbose=True` set for the Crew?
*   **Deliverable Path:** If a task is meant to produce a file deliverable (as per Blueprint and Plan), is it configured to do so (e.g., `FileWriterTool` with correct path/filename)? Does the execution block attempt to report the deliverable's status/location?
*   **Execution Logic:** Does the `kickoff()` method run correctly? Are inputs (if any) handled as per the Plan? Is the `results` variable captured and printed?
*   **Readability & Comments:** Is the code well-formatted? Are custom logic sections (especially in tools) adequately commented, including the justification for custom tools?
