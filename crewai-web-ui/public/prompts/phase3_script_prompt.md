## Construct Python Script

**Input:** The complete **'Design-Crew-Architecture-Plan' as a single JSON object**. No other information source should be used.

**Process:** Construct the Python script by meticulously implementing all specifications, configurations, and logic detailed in the **entirety of the input JSON plan**. Your exclusive role is to translate the provided architecture plan into code. Do not re-evaluate or change any architectural decisions.

**Output:** The final, runnable CrewAI Python script code block.

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
# Import specific standard tools (e.g., SerperDevTool) based on the `class_name` values in the JSON's `tool_repository`.
# from crewai_tools import SerperDevTool, FileWriterTool, FileReadTool
# from crewai.tools import BaseTool # UNCOMMENT if custom tools are defined
# from pydantic import BaseModel, Field # UNCOMMENT if Pydantic models are defined
# from typing import Type, List # UNCOMMENT for advanced type hinting if needed
from crewai import LLM # Used for LLMs section 
```

**API Key Access:**
* Use `os.getenv("YOUR_API_KEY_NAME")` for all API keys. The "YOUR_API_KEY_NAME" string comes from properties like `api_key_env_var` in the input JSON. **NO HARDCODED SECRETS.**

**LLM Instantiation:**
* Iterate through the `agent_cadre` list and the `workflow_process.manager_llm_specification` (if it exists) in the input JSON.
* For each unique LLM configuration, create an `LLM` instance using the `model`, and `api_key` properties provided in the JSON. The `temperature` MUST BE 0.0.

**Custom Tool & Pydantic Model Definitions (If applicable):**
* If `structured_data_handling.usage` is `true` in the JSON, iterate through `model_definitions` and generate a Pydantic `BaseModel` class for each object using its `class_name` and `fields`.
* If the `custom_tool_definitions` key exists and is not empty in the JSON, iterate through the list and generate a Python class for each custom tool.
    * The class name for the tool MUST be the `class_name` found in the corresponding `tool_repository` entry (which is linked by `tool_id`). The generated class should inherit from `BaseTool`.
    * **CRITICAL**: Insert the `justification_for_custom_tool` string from the JSON as a prominent comment above the class definition.
    * The tool's `name` attribute must be set to the value of `name_attribute` from the JSON.
    * The tool's `description` attribute must be set to the value of `description_attribute` from the JSON.
    * If `args_pydantic_model` is specified, set the tool's `args_schema` to that Pydantic class.
    * Define the `_run` method. The method's parameters MUST match the `name` and `python_type` specified in the `run_method_parameters` array.
    * The body of the `_run` method should be implemented based on the detailed steps provided in the `run_method_logic` string.

**Tool Instantiation:**
* Iterate through the `tool_repository` list in the JSON.
* For each object, instantiate the tool:
    * The Python variable name for the tool instance MUST be the `tool_id`.
    * **CRITICAL**: Before each tool instantiation line, insert the `usage_justification` from the JSON as a Python comment (`#`).
    * The class to instantiate is specified in the `class_name` property. This applies to both pre-built and custom tools.
    * If `initialization_params` exists and is not empty, pass its contents as keyword arguments to the class constructor.
    * When an API key is needed for a parameter (e.g., `os.getenv("SERPER_API_KEY")`), retrieve it from the environment.

**Agent Definitions:**
* Iterate through the `agent_cadre` list in the JSON.
* For each agent object, create an `Agent` instance using its `role`, `goal`, and `backstory`.
* **CRITICAL**: As part of the agent's definition, insert a Python comment block containing the agent's `llm_rationale` and `tool_rationale` from the JSON.
* Assign the correct pre-instantiated LLM object.
* To build the agent's `tools` list, find all tasks in the JSON's `task_roster` assigned to this agent's `role`. Collect the unique `enabling_tools` (`tool_id`s) from those tasks and map them to the tool instances you created.
* Set `verbose=True` and `allow_delegation` based on the JSON properties.

**Task Definitions:**
* Iterate through the `task_roster` list in the JSON.
* For each task object, create a `Task` instance:
    * The variable name is the `task_identifier`.
    * Use the `description` and assign the correct agent instance based on `assigned_agent_role`.
    * The `tools` list for the task must contain the specific tool instances corresponding to the `tool_id`s in the task's `enabling_tools` list. If `enabling_tools` is empty or not present, this MUST be an empty list `[]`.
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
    # Analyze the Blueprint and the 'task_roster' to determine if the crew's kickoff requires initial inputs.
    # If the first task description implies it needs data to start, define an 'inputs' dictionary.
    # For example: inputs = {'blueprint_file_path': 'path/to/your/blueprint.md'}
    # Then, call your_crew_instance.kickoff(inputs=inputs)
    results = your_crew_instance.kickoff()
    print("\n## Crew Operation Complete.")
    print("Final Results:")
    print(results)

    # To verify the final output, identify the task in the 'task_roster' that is responsible for
    # creating the final deliverable (e.g., a task using FileWriterTool).
    # Use the expected output filename from that task's description or expected_output field.
    # For example: final_deliverable_filename = "final_report.md"
    #
    # if final_deliverable_filename and os.path.exists(final_deliverable_filename):
    #    print(f"\nDeliverable '{final_deliverable_filename}' generated successfully.")
    # else:
    #    print(f"\nDeliverable file '{final_deliverable_filename}' was expected but not found.")
```


