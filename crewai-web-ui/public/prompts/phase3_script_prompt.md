## Construct Python Script

**Input:** The complete **'Design-Crew-Architecture-Plan' as a single JSON object** (conforming to the revised schema with `llm_registry` and `constructor_args`). No other information source should be used.

**Process:** Construct the Python script by meticulously implementing all specifications, configurations, and logic detailed in the **entirety of the input JSON plan**. Your exclusive role is to translate the provided architecture plan into code. Do not re-evaluate or change any architectural decisions.

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
from crewai import Agent, Task, Crew, Process
from crewai import LLM # For LLM section
# Import specific standard tools (e.g., SerperDevTool) based on the `class_name` values in the JSON's `tool_repository`.
# from crewai_tools import SerperDevTool, FileWriterTool, FileReadTool
from crewai.tools import BaseTool # UNCOMMENT if custom tools are defined
from pydantic import BaseModel, Field # UNCOMMENT if Pydantic models are defined
from typing import Type, List # UNCOMMENT for advanced type hinting if needed
```

**API Key Access:**
* Use `os.getenv("YOUR_API_KEY_NAME")` for all API keys, "GEMINI_API_KEY" for gemini and "DEEPSEEK_API_KEY" for deepseek models. The "YOUR_API_KEY_NAME" string comes from properties like `api_key` in the input JSON. **NO HARDCODED SECRETS.**

**LLM Instantiation:**
* Iterate through the `llm_registry` list in the input JSON.
* For each object in the registry, create an LLM instance.
* The Python variable for the instance MUST be derived from the `llm_id` (e.g., `llm_id: "gemini_pro_reasoner"` becomes `gemini_pro_reasoner_llm`).
* Use the `model` and `api_key` properties. The `temperature` MUST BE 0.0 and seed MOST BE 2.

**Custom Tool & Pydantic Model Definitions (If applicable):**
* **First, generate Pydantic Models:** If `structured_data_handling.usage` is `true` in the JSON, iterate through `model_definitions` and generate a Pydantic `BaseModel` class for each. These models may be used by custom tools.
* **Second, generate Custom Tools:** If the `custom_tool_definitions` key exists and is not empty in the JSON, iterate through the list and generate a Python class for each custom tool using the template below.

*__Custom Tool Generation Template:__*
```python
#
# Use the following template to generate each custom tool.
# Map the fields from the 'custom_tool_definitions' object in the JSON to the corresponding parts of the class.
#

# This comment block comes from the 'design_metadata.justification_for_custom_tool' field in the JSON.
# It explains why this custom tool is necessary.

# If 'class_definition_args.args_pydantic_model' is specified in the JSON for this tool,
# define its Pydantic class first. The class name and its fields
# come from the 'structured_data_handling.model_definitions' section.
class <ArgsPydanticModelFromJSON>(BaseModel):
    """Input schema for <ClassNameFromJSON>."""
    # The field names, types, and descriptions are defined in the
    # 'fields' object of the Pydantic model's definition in the JSON.
    argument_name: str = Field(..., description="Description of the argument.")


# The class name for the tool MUST be the 'class_name' found in the
# corresponding 'tool_repository.constructor_args' entry (linked by 'design_metadata.tool_id').
class <ClassNameFromJSON>(BaseTool):
    # The 'name' attribute is set from the 'class_definition_args.name_attribute' field in the JSON.
    name: str = "Name of the tool for the agent to use"
    # The 'description' attribute is set from the 'class_definition_args.description_attribute' field in the JSON.
    description: str = "Detailed description of what this tool does and when to use it."
    # The 'args_schema' is set to the Pydantic class defined above.
    # This comes from the 'class_definition_args.args_pydantic_model' field in the JSON.
    args_schema: Type[BaseModel] = <ArgsPydanticModelFromJSON>

    # The '_run' method's parameters MUST match the 'class_definition_args.run_method_parameters' in the JSON.
    # Implementted python logic for this method is a direct implementation of the
    # step-by-step description from the 'class_definition_args.run_method_logic' field in the JSON.
    def _run(self, argument_name: str) -> str:
        pass
```

**Tool Instantiation:**
* Iterate through the `tool_repository` list in the JSON.
* For each object, instantiate the tool:
    * The Python variable name for the tool instance MUST be the `tool_id` from the `constructor_args` object.
    * **CRITICAL**: Before each tool instantiation line, insert the `usage_justification` from the `design_metadata` object as a Python comment (`#`).
    * The class to instantiate is specified in the `class_name` property within `constructor_args`.
    * If `initialization_params` exists within `constructor_args`, pass its contents as keyword arguments to the class constructor.

**Agent Definitions:**
* Iterate through the `agent_cadre` list.
* For each agent object:
    * The variable name MUST be the agent's `role` (from `constructor_args`), formatted as a valid Python variable name (e.g., "Financial Analyst" becomes `financial_analyst_agent`).
    * **CRITICAL**: Before the agent definition, insert a Python comment block generated from the `design_metadata` object, including the `llm_rationale`, `tool_rationale`, and `delegation_rationale`.
    * To instantiate the `Agent`, use the keys from the `constructor_args` object as parameters and convert the values to the appropriate python types.
    * **LLM Assignment**: Use the `llm_id` from `constructor_args` to assign the correct, pre-instantiated LLM variable to the `llm` parameter.
    * **Tool Assignment**: Use the list of `tool_id`s from the `constructor_args.tools` array to build the list of tool instances for the `tools` parameter.

**Task Definitions:**
* Iterate through the `task_roster` list.
* For each task object:
    * The variable name for the instance MUST be the `task_identifier` from the task's `design_metadata` object.
    * To instantiate the `Task`, use the keys from the `constructor_args` object as parameters.
    * The `agent` parameter is assigned the agent instance whose `role` matches the `constructor_args.agent` string.
    * The `tools` list for the task must contain the specific tool instances corresponding to the `tool_id`s in the `constructor_args.tools` list. If the list is empty or not present, this MUST be an empty list `[]`.
    * Set `context` by finding the task instances that match the identifiers in `constructor_args.context`.
    * If `constructor_args.output_pydantic` is specified, assign the corresponding Pydantic class to the `output_pydantic` parameter.

**Crew Assembly:**
* Create the `Crew` instance based on the properties in the input JSON.
* `agents`: List of all instantiated agent objects.
* `tasks`: List of all instantiated task objects.
* `process`: Set based on `workflow_process.selected_process`.
* `manager_llm`: If `process` is hierarchical, use the `workflow_process.manager_llm_specification.llm_id` to assign the correct pre-instantiated LLM object.
* `memory`: Set based on `crew_memory.activation`.
* `embedder`: If memory is active, configure it using the `crew_memory.embedder_config` object and set the url to be for the use attribute you should use attribute url = f"http://{os.environ['OLLAMA_HOST']}/api/embeddings".
* Set `verbose=False`.

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

**Output:** The Python script block for CrewAI based on this should be the ONLY output generated.
