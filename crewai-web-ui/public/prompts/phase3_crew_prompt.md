
### 3. `crew.py` Generation Logic (Orchestration)

Use the JSON object provided as the single source of truth. Your task is to generate the content the main Python file that defines all programmatic components and assembles the CrewBase class corresposndent to `crew.py` of the recommended project structure of CrewAi lib  https://docs.crewai.com/en/quickstart.

#### **Environment Setup (Order is CRITICAL):**

**Core Imports:**

  * After the final code is done you should reevaluate the imports and add the ones tha might be missing with the goal to have a working code.

```python
import os
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv()) # MUST BE CALLED EARLY
from crewai import Agent, Task, Crew, Process
from crewai import LLM # For LLM section
from pydantic import BaseModel, Field, RootModel
from typing import List, Optional

from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent

from crewai_tools import MCPServerAdapter

from mcp import StdioServerParameters 
```

# Example for import for tools from crewai_tools
For each task_roster[*].design_metadata.tools[*].canonical_tool.class_name you should import the class propely  
from crewai_tools import <all task_roster[*].design_metadata.tools[*].canonical_tool.class_name>

# Import custom tools from classes in the tools directory
For each  `custom_tool` in `tools` in `task_roster` of json you should import its class using this pattern: from .tools.tool_id import "class_definition"."class_name"



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


  * **If `crew_memory.activation` is `true` or any tool in the `tool_repository` list in the JSON has `design_metadata.is_custom_embedding_supported` set to `true`:**
    1.  **Create `embedder_config`:**
          * Create a Python dictionary variable named `embedder_config`.
          * Populate it using the `provider` and `config` from the `crew_memory.embedder_config` object in the JSON.
          * **CRITICAL:** In the `config` sub-dictionary, replace the `base_url_env_var` key with a `base_url` key. Set its value to an f-string that constructs the URL using the OLLAMA\_HOST variable (e.g., `f"http://{OLLAMA_HOST}"`).
    2.  **Create `rag_config`:**
          * Create a Python dictionary variable named `rag_config`.
          * This dictionary MUST have two keys: `llm` and `embedder`.
          * The `llm` value must be a fixed dictionary for a local provider: `{ "provider": "ollama", "config": { "model": "llama3:instruct", "temperature": 0.0 } }`.
          * The `embedder` value must be the `embedder_config` variable created in the previous step.

**Tool Instantiation exclusive for canonical_tool:**

  *  **Objective:** Iterate through task_roster[*].design_metadata.tools[*].canonical_tool and generate Python code to instantiate each tool:
      * The Python variable name for the tool instance MUST be the `tool_id` from the `constructor_args` object.
      * The class to instantiate is specified in `class_name` within `constructor_args`.
      * **If `design_metadata.is_custom_embedding_supported` is `true`:**
          * Instantiate the tool by passing the pre-defined `rag_config` variable to its `config` parameter (e.g., `tool_instance = PDFSearchTool(config=rag_config)`).
      * **If `class_name` is `MCPServerAdapter`:**
          * First, instantiate `StdioServerParameters`. The variable name should be `<tool_id>_params`. The `command` and `args` are taken from `constructor_args.initialization_params.serverparams`.
          * Then, instantiate `MCPServerAdapter`, passing the `_params` variable to its constructor without any keyword arguments. The variable name for the adapter MUST be the `tool_id`.
      * **For all other tools:**
          * If `initialization_params` exists and is non-empty, pass its contents as keyword arguments to the class constructor.


#### **CrewBase Definition (Orchestration):**

  * Generate a Python class named **`CrewaiGenerated`**  annoted with `@CrewBase`.

  * Set the class variables: `agents_config = 'config/agents.yaml'` and `tasks_config = 'config/tasks.yaml'`.

  * The class should have the following vai:


```python
    agents: List[BaseAgent]
    tasks: List[Task]
```

  * **`@agent` Methods:**

      * For each agent in `agent_cadre`, create a method decorated with `@agent`.
      * The method name MUST be the agent's `yaml_definition.yaml_id`.
      * The method returns an `Agent` instance, loading its config from YAML: `config=self.agents_config['<yaml_id>']`.
      * Assign the correct pre-instantiated LLM variable to the `llm` parameter.


  * **`@task` Methods:**

      * For each task in `task_roster`, create a method decorated with `@task`.
      * The method name MUST be the task's `yaml_definition.yaml_id`.
      * The method returns a `Task` instance, loading its config from YAML: `config=self.tasks_config['<yaml_id>']`.
      * The `agent` parameter is assigned the result of the corresponding `@agent` method call (e.g., `agent=self.search_orchestrator_agent()`).
      * The `context` parameter is a list of calls to prerequisite `@task` methods (e.g., `context=[self.task_one(), self.task_two()]`).
      * Assign the tool list to the `tools` parameter. For standard tools, use the tool instance variable. For MCP tools, **you MUST unpack the adapter's `.tools` property** (e.g., `tools=[*search_adapter.tools]`).
      
  * **`@crew` Method:**
  * Create the `Crew` instance based on the properties in the input JSON.
  * `agents`: self.agents, # Automatically created by the @agent decorator
  * `tasks`: self.tasks, # Automatically created by the @task decorator
  * `process`: Set based on `workflow_process.selected_process`.
  * `manager_llm`: If `process` is hierarchical, assign the correct pre-instantiated LLM object.
  * `memory`: Set based on `crew_memory.activation`.
  * `embedder`: If `crew_memory.activation` is `True`, assign the pre-defined `embedder_config` variable to this parameter.
  * Set `verbose=True`.