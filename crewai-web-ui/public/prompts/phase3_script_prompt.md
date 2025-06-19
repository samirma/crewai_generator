
Use the previous json to construct the Python script by meticulously implementing all specifications, configurations, and logic detailed in the . Your exclusive role is to translate the provided architecture plan into code. Do not re-evaluate or change any architectural decisions.

**Script Structure & Content Requirements:**

* **Self-Correction:** The output will be a valid and working python script

**Environment Setup (Order is CRITICAL):**
```python
import os
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv()) # MUST BE CALLED EARLY
```

**Core Imports:**
*   Based on the input JSON, import all necessary libraries.
*   For all tools specified in `tool_repository`, import the class specified in `constructor_args.class_name` directly from `crewai_tools`.
*   Uncomment `from crewai.tools import BaseTool` if `custom_tool_definitions` exists and is not empty in the JSON.
*   Uncomment `from pydantic import BaseModel, Field` if custom tools with arguments are defined.

```python
from crewai import Agent, Task, Crew, Process
from crewai import LLM # For LLM section

# Example for import for tools from crewai_tools
from crewai_tools import SerperDevTool, FileWriterTool, FileReadTool

# from crewai.tools import BaseTool # UNCOMMENT if custom tools are defined
# from pydantic import BaseModel, Field # UNCOMMENT if Pydantic models are defined
# from typing import Type, List # UNCOMMENT for advanced type hinting if needed
```

**API Key Access:**
*   Use `os.getenv("YOUR_API_KEY_NAME")` for all API keys, "GEMINI_API_KEY" for gemini and "DEEPSEEK_API_KEY" for deepseek models. The "YOUR_API_KEY_NAME" string comes from properties like `api_key` in the input JSON. **NO HARDCODED SECRETS.**

**LLM Instantiation:**
*   Generate Python code to initialize multiple LLM instances compatible with the `crewai.LLM` class.
*   Iterate through the `llm_registry` list from the input JSON.
*   For each LLM object, create a Python variable. The variable name MUST be the `llm_id` followed by `_llm` (e.g., `llm_id: "gemini_pro_reasoner"` becomes the variable `gemini_pro_reasoner_llm`).
*   Each instance should be created by calling the `LLM` class. The parameters for the `LLM` constructor MUST be taken directly from the corresponding keys in each JSON object:
    *   `model`: Use the value from the `model` key.
    *   `temperature`: Use the value from the `temperature` key.
    *   `frequency_penalty`: Use the value from the `frequency_penalty` key.
    *   `presence_penalty`: Use the value from the `presence_penalty` key.
    *   `timeout`: Use the value from the `timeout` key.
    *   `max_tokens`: Use the value from the `max_tokens` key.
    *   `api_key`: Use the value from the `api_key_env_var` key. This value is the name of a Python variable that holds the API key (e.g., if `api_key_env_var` is `"GOOGLE_API_KEY"`, the code should use the variable `GOOGLE_API_KEY`). If `api_key_env_var` is `null`, use `None` for the `api_key`.
    *   `seed`: This MUST be a fixed value of `2`.

**Example of the expected output format for one entry:**
```python
# For the entry with llm_id: "gemini_flash_multimodal"
gemini_pro_reasoner_llm = LLM(
    model="gemini/gemini-2.5-flash-preview-05-20",
    api_key=GOOGLE_API_KEY,
    temperature=0.0,
    frequency_penalty=0.0,
    presence_penalty=0.0,
    timeout=600,
    max_tokens=65536,
    seed=2
)
```

**Custom Tool & Pydantic Model Definitions (If applicable):**
*   **First, generate Pydantic Models:** If `structured_data_handling.usage` is `true` in the JSON, iterate through `model_definitions` and generate a Pydantic `BaseModel` class for each. These models may be used by custom tools.
*   **Second, generate Custom Tools:** If the `custom_tool_definitions` key exists and is not empty in the JSON, iterate through the list and generate a Python class for each custom tool using the template below.

*__Custom Tool Generation Template:__*
```python
#
# Use the following template to generate each custom tool.
# Map the fields from the 'custom_tool_definitions' object in the JSON to the corresponding parts of the class.
#

# This comment block comes from the 'design_metadata.justification_for_custom_tool' field in the JSON.
# It explains why this custom tool is necessary.

# If 'class_definition_args.args_pydantic_model' and 'run_method_parameters' are specified,
# define its Pydantic class first.
# The class name is <class_definition_args.args_pydantic_model>.
class <ArgsPydanticModelFromJSON>(BaseModel):
    # Iterate through each object in 'class_definition_args.run_method_parameters'.
    # For each object, generate a field in the Pydantic model.
    # The field name is <parameter.name>.
    # The type is <parameter.python_type>.
    # The description is <parameter.description>.
    <parameter_1_name>: <parameter_1_type> = Field(..., description="<parameter_1_description>")
    <parameter_2_name>: <parameter_2_type> = Field(..., description="<parameter_2_description>")
    # ...and so on for all parameters.


# The class name for the tool MUST be the 'class_name' found in the
# corresponding 'tool_repository.constructor_args' entry (linked by 'design_metadata.tool_id').
class <ClassNameFromJSON>(BaseTool):
    # The 'name' attribute is set from the 'class_definition_args.name_attribute' field in the JSON.
    name: str = "<name_attribute>"
    # The 'description' attribute is set from the 'class_definition_args.description_attribute' field in the JSON.
    description: str = "<description_attribute>"
    # The 'args_schema' is set to the Pydantic class defined above.
    # This comes from the 'class_definition_args.args_pydantic_model' field in the JSON.
    args_schema: Type[BaseModel] = <ArgsPydanticModelFromJSON>

    # The '_run' method's parameters MUST be generated from 'class_definition_args.run_method_parameters'.
    # For each object in the array, add a parameter with its 'name' and 'python_type'.
    # The python logic for this method is a direct implementation of the
    # step-by-step description from the 'class_definition_args.run_method_logic' field.
    def _run(self, <parameter_1_name>: <parameter_1_type>, <parameter_2_name>: <parameter_2_type>) -> str:
        # Implement logic from 'run_method_logic' here.
        pass
```

**Tool Instantiation:**
*   Iterate through the `tool_repository` list in the JSON.
*   For each object, instantiate the tool:
    *   The Python variable name for the tool instance MUST be the `tool_id` from the `constructor_args` object.
    *   **CRITICAL**: Before each tool instantiation line, insert the `tool_selection_justification` from the `design_metadata` object as a Python comment (`#`).
    *   The class to instantiate is specified in the `class_name` property within `constructor_args`.
    *   **If `initialization_params` exists within `constructor_args` AND is a non-empty dictionary, pass its contents as keyword arguments to the class constructor.**
        *   **Special Handling for `config`:** If `initialization_params` contains a `config` object (for embedding-supported tools), generate the Python `dict` for it with the following transformations:
            *   **For the `llm` config:** The generated Python `llm` dictionary should only contain a `provider` key and a nested `config` dictionary.
                *   The `model` key from the JSON's `llm` object MUST be placed *inside* this nested `config` dictionary, not at the top level.
                *   In the nested `config` dictionary, replace the `api_key_env_var` key from the JSON with an `api_key` key in Python, and set its value to `os.getenv("...")`, using the environment variable name from the JSON.
            *   **For the `embedder` config:** In the `config` sub-dictionary, if a `base_url_env_var` key exists, replace it with a `base_url` key in Python. Set its value to an f-string like `f"http://{os.getenv('OLLAMA_HOST', 'localhost:11434')}"`.

**Agent Definitions:**
*   Iterate through the `agent_cadre` list.
*   For each agent object:
    *   The variable name MUST be the agent's `role` (from `constructor_args`), formatted as a valid Python variable name (e.g., "Financial Analyst" becomes `financial_analyst_agent`).
    *   To instantiate the `Agent`, use the keys from the `constructor_args` object as parameters and convert the values to the appropriate python types.
    *   **LLM Assignment**: Use the `llm_id` from `constructor_args` to assign the correct, pre-instantiated LLM variable to the `llm` parameter.

**Task Definitions:**
*   Iterate through the `task_roster` list.
*   For each task object:
    *   The variable name for the instance MUST be the `task_identifier` from the task's `design_metadata` object.
    *   To instantiate the `Task`, use the keys from the `constructor_args` object as parameters.
    *   The `agent` parameter is assigned the agent instance whose `role` matches the `constructor_args.agent` string.
    *   The `tools` list for the task must contain the specific tool instances corresponding to the `tool_id`s in the `constructor_args.tools` list. If the list is empty or not present, this MUST be an empty list `[]`.
    *   Set `context` by finding the task instances that match the identifiers in `constructor_args.context`.
    *   If `constructor_args.output_pydantic` is specified, assign the corresponding Pydantic class to the `output_pydantic` parameter.

**Crew Assembly:**
*   Create the `Crew` instance based on the properties in the input JSON.
*   `agents`: List of all instantiated agent objects.
*   `tasks`: List of all instantiated task objects.
*   `process`: Set based on `workflow_process.selected_process`.
*   `manager_llm`: If `process` is hierarchical, use the `workflow_process.manager_llm_specification.llm_id` to assign the correct pre-instantiated LLM object.
*   `memory`: Set based on `crew_memory.activation`.
*   `embedder`: If `crew_memory.activation` is `True`, create an `embedder` dictionary for the `Crew` constructor.
    *   This dictionary should be built from the `crew_memory.embedder_config` object in the JSON.
    *   **CRITICAL:** In the `config` sub-dictionary, if a `base_url_env_var` key exists (e.g., for 'ollama'), replace it with a `base_url` key in the Python code. The value must be an f-string that constructs the URL, e.g., `f"http://{OLLAMA_HOST}"`, using the environment variable name from the JSON.
*   Set `verbose=True`.

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
