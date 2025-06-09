## Construct Python Script

**Input:** The complete **'Design-Crew-Architecture-Plan' as a single JSON object**. No other information source should be used.

**Process:** Construct the Python script by meticulously implementing all specifications, configurations, and logic detailed in the **entirety of the input JSON plan**. Your exclusive role is to translate the provided architecture plan into code. Do not re-evaluate or change any architectural decisions.

**Output:** The final, runnable CrewAI Python script.

**Script Structure & Content Requirements:**

**Environment Setup (Order is CRITICAL):**
```python
import os
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv()) # MUST BE CALLED EARLY
```

**Core Imports:**
* Based on the input JSON, import all necessary libraries.
* Uncomment `from crewai.tools import BaseTool` if `custom_tool_definitions` exists and is not empty in the JSON.
* Uncomment `from pydantic import BaseModel, Field` if `structured_data_handling.usage` is `true` in the JSON.
```python
from crewai import LLM, Agent, Task, Crew, Process
# Import specific standard tools (e.g., SerperDevTool) based on the `tool_type` values in the JSON's `tool_repository`.
# from crewai_tools import SerperDevTool, FileWriterTool, FileReadTool
# from crewai.tools import BaseTool # UNCOMMENT if custom tools are defined
# from pydantic import BaseModel, Field # UNCOMMENT if Pydantic models are defined
# from typing import Type, List # UNCOMMENT for advanced type hinting if needed
```

**API Key Access:**
* Use `os.getenv("YOUR_API_KEY_NAME")` for all API keys. The "YOUR_API_KEY_NAME" string comes from properties like `api_key_env_var` in the input JSON. **NO HARDCODED SECRETS.**

**LLM Instantiation:**
* Iterate through the `agent_cadre` list and the `workflow_process.manager_llm_specification` (if it exists) in the input JSON.
* For each unique LLM configuration, create an `LLM` instance using the `model`, `temperature`, `api_key`, and `multimodal` properties provided in the JSON. `temperature` MUST BE 0.0.

**Custom Tool & Pydantic Model Definitions (If applicable):**
* If the `custom_tool_definitions` key exists in the JSON, iterate through the list and generate a Python class for each object. Use the `class_name`, `tool_name_attr`, `description_attr`, `args_schema_class_name`, and `run_method_signature`.
    * **CRITICAL**: Insert the `justification_for_custom_tool` string from the JSON as a prominent comment above each generated class definition.
    * Implement the `_run` method based on the `run_method_logic_description`.
* If `structured_data_handling.usage` is `true`, iterate through `model_definitions` and generate a Pydantic class for each object using its `class_name` and `fields`.

**Tool Instantiation:**
* Iterate through the `tool_repository` list in the JSON.
* For each object, instantiate the tool:
    * The Python variable name should be the `config_id`.
    * The class to instantiate is the `tool_type`.
    * The constructor arguments are in `initialization_params`. Fetch API keys using `os.getenv()`.

**Agent Definitions:**
* Iterate through the `agent_cadre` list in the JSON.
* For each agent object, create an `Agent` instance using its `role`, `goal`, and `backstory`.
* Assign the correct pre-instantiated LLM object.
* To build the agent's `tools` list, find all tasks in the JSON's `task_roster` assigned to this agent's `role`. Collect the unique `enabling_tools` (`config_id`s) from those tasks and map them to the tool instances you created.
* Set `verbose=True` and `allow_delegation` based on the JSON properties.

**Task Definitions:**
* Iterate through the `task_roster` list in the JSON.
* For each task object, create a `Task` instance:
    * The variable name is the `task_identifier`.
    * Use the `description` and assign the correct agent instance based on `assigned_agent_role`.
    * The `tools` list for the task must contain the specific tool instances corresponding to the `config_id`s in the task's `enabling_tools` list.
    * Set `context` by finding the task instances that match the identifiers in `context_tasks`.
    * If `output_pydantic_model` is specified, assign the corresponding Pydantic class to the `output_pydantic` parameter.

**Crew Assembly:**
* Create the `Crew` instance based on the properties in the input JSON.
* `agents`: List of all instantiated agent objects.
* `tasks`: List of all instantiated task objects.
* `process`: Set based on `workflow_process.selected_process`.
* `manager_llm`: Assign if `process` is hierarchical.
* `memory`: Set based on `crew_memory.activation`.
* `embedder`: If memory is active, configure it using the `crew_memory.embedder_config` object.
* Set `verbose=True`.

**Execution Block:**
```python
if __name__ == "__main__":
    print("## Initializing Crew...")
    # kickoff() arguments should be determined by analyzing the Blueprint/Plan.
    # If the process requires initial inputs, they should be defined here.
    # inputs_dict = {"example_key": "example_value"}
    results = your_crew_instance.kickoff() # Use kickoff(inputs=...) if needed
    print("\n## Crew Operation Complete.")
    print("Final Results:")
    print(results)

    # Add file checking logic if a deliverable with a filename was specified in the plan's task roster.
    # final_deliverable_filename = "output_report.md"
    # if final_deliverable_filename and os.path.exists(final_deliverable_filename):
    #    print(f"\nDeliverable '{final_deliverable_filename}' generated successfully.")
    # else:
    #    print(f"\nDeliverable file '{final_deliverable_filename}' was expected but not found.")
```

As a result of this prompt, a python code should be written
