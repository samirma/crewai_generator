**Script Structure & Content Requirements:**

Use the JSON object before as the souly source of truth and basis to develop a complete and structured CrewAI project.

* **Self-Correction:** The output will consist of four separate, valid, and working file blocks, formatted as markdown code blocks.
* **Project Structure Alignment:** The output must adhere to the recommended CrewAI project structure, separating configuration from orchestration and execution. You should follow the crewai documentation https://docs.crewai.com/en/quickstart

---

## Output Blocks (Order is CRITICAL)

The output must contain four separate markdown blocks in the following order:

1.  **`config/agents.yaml`** (Declarative Agent Configuration)
2.  **`config/tasks.yaml`** (Declarative Task Configuration)
3.  **`crew.py`** (Orchestration, LLM/Tool Instantiation, and CrewBase Definition)
4.  **`main.py`** (Project Execution Entry Point)

---

### 1. `config/agents.yaml` Generation Logic

Iterate through the `agent_cadre` list. For each agent, generate a YAML entry where the key is the `yaml_definition.yaml_id`. The contents must be derived from the `yaml_definition` object, plus the `constructor_args.allow_delegation` setting.

* **Keys to Include:** `role`, `goal`, `backstory`, `allow_delegation` with a proper support for multiple lines values.

### 2. `config/tasks.yaml` Generation Logic

Iterate through the `task_roster` list. For each task, generate a YAML entry where the key is the `yaml_definition.yaml_id`. The contents must be derived from the `yaml_definition` and `constructor_args` objects.

* **Keys to Include:** `description`, `expected_output`, `agent`, `context` with a proper support for multiple lines values.
* **`context` and `output_json`** must be derived from `constructor_args`. If the corresponding array/string is empty or null, omit the key from the YAML output.

---

### 3. `crew.py` Generation Logic (Orchestration)

This block generates the main Python file that defines all programmatic components and assembles the CrewBase class.

#### **Environment Setup (Order is CRITICAL):**

```python
import os
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv()) # MUST BE CALLED EARLY
```

**Core Imports:**

  * Based on the input JSON, import all necessary libraries.
  * For all tools specified in `tool_repository`, import the class specified in `constructor_args.class_name` directly from `crewai_tools`.
  * Import `MCPServerAdapter` from `crewai_tools` and `StdioServerParameters` from `mcp` if any tool uses the `MCPServerAdapter` class.
  * Import `BaseModel`, `Field`, and `RootModel` from `pydantic`.
  * Import `List` and `Optional` from `typing`.
  * Uncomment `from crewai.tools import BaseTool` if `custom_tool_definitions` exists and is not empty in the JSON.


```python
from crewai import Agent, Task, Crew, Process
from crewai import LLM # For LLM section
from pydantic import BaseModel, Field, RootModel
from typing import List, Optional

# Example for import for tools from crewai_tools
from crewai_tools import SerperDevTool, FileWriterTool, FileReadTool, MCPServerAdapter

# from mcp import StdioServerParameters # UNCOMMENT if MCP tools are defined
# from crewai.tools import BaseTool # UNCOMMENT if custom tools are defined
```

#### **Core Imports & Pydantic Definitions:**

  * Import `StdioServerParameters` from `mcp` if any tool uses the `MCPServerAdapter` class.
  * Import necessary classes from `crewai_tools` and `crewai.project` (`CrewBase`, `agent`, `task`, `crew`).
  * Generate **all Pydantic Models** from `pydantic_model_definitions`.

#### **API Key Access:**

  * Retrieve `OLLAMA_HOST` using `os.getenv("OLLAMA_HOST", "localhost:11434")`.
  * Use `os.getenv("YOUR_API_KEY_NAME")` for all keys. **NO HARDCODED SECRETS.**

**LLM Instantiation:**

  * Generate Python code to initialize multiple LLM instances compatible with the `crewai.LLM` class.
  * Iterate through the `llm_registry` list from the input JSON.
  * For each LLM configuration object in the list:
      * Create a Python variable. The variable name MUST be the `llm_id` from the `design_metadata` object, followed by `_llm` (e.g., `llm_id: "gemini_1_5_flash_reasoner"` becomes the variable `gemini_1_5_flash_reasoner_llm`).
      * Instantiate the `LLM` class. The keyword arguments for the `LLM` constructor MUST be taken directly from the `constructor_args` object of the current LLM configuration.
  * Set `seed=2` for all LLM instances.

#### **Reusable RAG and Embedder Configuration (if applicable):**

  * If `crew_memory.activation` is `true` or embedding is supported, create `embedder_config` and `rag_config` as per original prompt logic.

**Tool Instantiation:**

  * Iterate through the `tool_repository` list in the JSON.
  * For each object, instantiate the tool:
      * The Python variable name for the tool instance MUST be the `tool_id` from the `constructor_args` object.
      * **CRITICAL**: Before each tool instantiation line, insert the `tool_selection_justification` from the `design_metadata` object as a Python comment (`#`).
      * The class to instantiate is specified in `class_name` within `constructor_args`.
      * **If `design_metadata.is_custom_embedding_supported` is `true`:**
          * Instantiate the tool by passing the pre-defined `rag_config` variable to its `config` parameter (e.g., `tool_instance = PDFSearchTool(config=rag_config)`).
      * **If `class_name` is `MCPServerAdapter`:**
          * First, instantiate `StdioServerParameters`. The variable name should be `<tool_id>_params`. The `command` and `args` are taken from `constructor_args.initialization_params.serverparams`.
          * Then, instantiate `MCPServerAdapter`, passing the `_params` variable to its constructor without any keyword arguments. The variable name for the adapter MUST be the `tool_id`.
      * **For all other tools:**
          * If `initialization_params` exists and is non-empty, pass its contents as keyword arguments to the class constructor.

#### **CrewBase Definition (Orchestration):**

  * Generate a Python @CrewBase class named **`CrewaiGenerated`** that inherits from `CrewBase`.

  * Set the class variables: `agents_config = 'config/agents.yaml'` and `tasks_config = 'config/tasks.yaml'`.

  * **`@agent` Methods:**

      * For each agent in `agent_cadre`, create a method decorated with `@agent`.
      * The method name MUST be the agent's `yaml_definition.yaml_id`.
      * The method returns an `Agent` instance, loading its config from YAML: `config=self.agents_config['<yaml_id>']`.
      * Assign the correct pre-instantiated LLM variable to the `llm` parameter.
      * Assign the tool list to the `tools` parameter. For standard tools, use the tool instance variable. For MCP tools, **you MUST unpack the adapter's `.tools` property** (e.g., `tools=[*search_adapter.tools]`).

  * **`@task` Methods:**

      * For each task in `task_roster`, create a method decorated with `@task`.
      * The method name MUST be the task's `yaml_definition.yaml_id`.
      * The method returns a `Task` instance, loading its config from YAML: `config=self.tasks_config['<yaml_id>']`.
      * The `agent` parameter is assigned the result of the corresponding `@agent` method call (e.g., `agent=self.search_orchestrator_agent()`).
      * The `context` parameter is a list of calls to prerequisite `@task` methods (e.g., `context=[self.task_one(), self.task_two()]`).
      * The `output_json` parameter is assigned the Pydantic Class object if defined.
      * The `tools` parameter follows the same unpacking rule as the `@agent` methods.

  * **`@crew` Method:**

      * Create a method decorated with `@crew` that returns the final `Crew` instance.
      * Set `process` based on `workflow_process.selected_process`.
      * Set `manager_llm` if hierarchical.
      * Set `memory` and `embedder` based on `crew_memory.activation` and the created `embedder_config` (if applicable).
      * Set `verbose=True`.

### 4\. `main.py` Generation Logic (Execution)

This block generates the simple entry point script.

  * Import the `CrewaiGenerated` class.
  * Include standard environment setup.
  * Add a conditional check to create the `output` directory if the project blueprint implies file writing to that location.
  * Instantiate and kick off the crew: `CrewaiGenerated().crew().kickoff()`.
