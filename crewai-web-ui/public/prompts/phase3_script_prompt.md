**Script Structure & Content Requirements:**

* **Self-Correction:** The output will be a valid and working python script

**Environment Setup (Order is CRITICAL):**

```python
import os
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv()) # MUST BE CALLED EARLY
````

**Core Imports:**

  * Based on the input JSON, import all necessary libraries.
  * For all tools specified in `tool_repository`, import the class specified in `constructor_args.class_name` directly from `crewai_tools`.
  * Import `MCPServerAdapter` from `crewai_tools` and `StdioServerParameters` from `mcp` if any tool uses the `MCPServerAdapter` class.
  * Uncomment `from crewai.tools import BaseTool` if `custom_tool_definitions` exists and is not empty in the JSON.
  * Uncomment `from typing import Type, List, Optional` for advanced type hinting if needed.


```python
from crewai import Agent, Task, Crew, Process
from crewai import LLM # For LLM section

# Example for import for tools from crewai_tools
from crewai_tools import SerperDevTool, FileWriterTool, FileReadTool, MCPServerAdapter

# from mcp import StdioServerParameters # UNCOMMENT if MCP tools are defined
# from crewai.tools import BaseTool # UNCOMMENT if custom tools are defined
# from pydantic import BaseModel, Field # UNCOMMENT if Pydantic models are defined
# from typing import Type, List, Optional # UNCOMMENT for advanced type hinting if needed
```

**API Key Access:**

  * Use `os.getenv("YOUR_API_KEY_NAME")` for all API keys, such as "GEMINI\_API\_KEY", "DEEPSEEK\_API\_KEY", and "BRAVE\_API\_KEY". The "YOUR\_API\_KEY\_NAME" string comes from properties like `api_key` in the `llm_registry` or the `env` block of MCP servers. **NO HARDCODED SECRETS.**
  * Retrieve the OLLAMA\_HOST using `os.getenv("OLLAMA_HOST", "localhost:11434")` and store it in a variable.

**LLM Instantiation:**

  * Generate Python code to initialize multiple LLM instances compatible with the `crewai.LLM` class.
  * Iterate through the `llm_registry` list from the input JSON.
  * For each LLM configuration object in the list:
      * Create a Python variable. The variable name MUST be the `llm_id` from the `design_metadata` object, followed by `_llm` (e.g., `llm_id: "gemini_1_5_flash_reasoner"` becomes the variable `gemini_1_5_flash_reasoner_llm`).
      * Instantiate the `LLM` class. The keyword arguments for the `LLM` constructor MUST be taken directly from the `constructor_args` object of the current LLM configuration.
  * Set `seed=2` for all LLM instances.

**Reusable RAG and Embedder Configuration:**

  * **If `crew_memory.activation` is `true`:**
    1.  **Create `embedder_config`:**
          * Create a Python dictionary variable named `embedder_config`.
          * Populate it using the `provider` and `config` from the `crew_memory.embedder_config` object in the JSON.
          * **CRITICAL:** In the `config` sub-dictionary, replace the `base_url_env_var` key with a `base_url` key. Set its value to an f-string that constructs the URL using the OLLAMA\_HOST variable (e.g., `f"http://{OLLAMA_HOST}"`).
    2.  **Create `rag_config`:**
          * Create a Python dictionary variable named `rag_config`.
          * This dictionary MUST have two keys: `llm` and `embedder`.
          * The `llm` value must be a fixed dictionary for a local provider: `{ "provider": "ollama", "config": { "model": "llama3:instruct", "temperature": 0.0 } }`.
          * The `embedder` value must be the `embedder_config` variable created in the previous step.

**Tool Instantiation:**

  * Iterate through the `tool_repository` list in the JSON.
  * For each object, instantiate the tool:
      * The Python variable name for the tool instance MUST be the `tool_id` from the `constructor_args` object.
      * **CRITICAL**: Before each tool instantiation line, insert the `tool_selection_justification` from the `design_metadata` object as a Python comment (`#`).
      * The class to instantiate is specified in `class_name` within `constructor_args`.
      * **If `design_metadata.is_custom_embedding_supported` is `true` AND `crew_memory.activation` is `true`:**
          * Instantiate the tool by passing the pre-defined `rag_config` variable to its `config` parameter (e.g., `tool_instance = PDFSearchTool(config=rag_config)`).
      * **If `class_name` is `MCPServerAdapter`:**
          * First, instantiate `StdioServerParameters`. The variable name should be `<tool_id>_params`. The `command` and `args` are taken from `constructor_args.initialization_params.serverparams`.
          * Then, instantiate `MCPServerAdapter`, passing the `_params` variable to its constructor without any keyword arguments. The variable name for the adapter MUST be the `tool_id`.
      * **For all other tools:**
          * If `initialization_params` exists and is non-empty, pass its contents as keyword arguments to the class constructor.

**Agent Definitions:**

  * Iterate through the `agent_cadre` list.
  * For each agent object:
      * The variable name MUST be the agent's `role` (from `constructor_args`), formatted as a valid Python variable name (e.g., "Financial Analyst" becomes `financial_analyst_agent`).
      * Instantiate the `Agent` using the keys from the `constructor_args` object.
      * Assign the correct pre-instantiated LLM variable to the `llm` parameter.
      * **CRITICAL for Tool Lists**: Create a Python list for the agent's tools. For standard tools, use the tool instance variable. For `MCPServerAdapter` tools, you MUST unpack the adapter's `.tools` property into the list (e.g., `tools=[*brave_search_adapter.tools, file_writer_tool]`). Assign this list to the `tools` parameter of the `Agent` constructor.

**Task Definitions:**

  * Iterate through the `task_roster` list.
  * For each task object:
      * The variable name for the instance MUST be the `task_identifier` from the task's `design_metadata` object.
      * Instantiate the `Task` using the keys from the `constructor_args` object.
      * The `agent` parameter is assigned the agent instance whose `role` matches the `constructor_args.agent` string.
      * **CRITICAL for Tool Lists**: Create a Python list for the task's tools. For standard tools, use the tool instance variable. For `MCPServerAdapter` tools, you MUST unpack the adapter's `.tools` property into the list (e.g., `tools=[*brave_search_adapter.tools, file_writer_tool]`).
      * Set `context` by finding the task instances that match the identifiers in `constructor_args.context`.

**Crew Assembly:**

  * Create the `Crew` instance based on the properties in the input JSON.
  * `agents`: List of all instantiated agent objects.
  * `tasks`: List of all instantiated task objects.
  * `process`: Set based on `workflow_process.selected_process`.
  * `manager_llm`: If `process` is hierarchical, assign the correct pre-instantiated LLM object.
  * `memory`: Set based on `crew_memory.activation`.
  * `embedder`: If `crew_memory.activation` is `True`, assign the pre-defined `embedder_config` variable to this parameter.
  * Set `verbose=True`.

**Execution Block:**

```python
if __name__ == "__main__":
    print("## Initializing Crew...")
    # Analyze the Blueprint and the 'task_roster' to determine if the crew's kickoff requires initial inputs.
    # If the first task description implies it needs data to start, define an 'inputs' dictionary.
    # For example: inputs = {'blueprint_file_path': 'path/to/your/blueprint.md'}
    
    # If inputs are needed:
    # results = your_crew_instance.kickoff(inputs=inputs)
    
    # If no inputs are needed:
    results = your_crew_instance.kickoff()
```