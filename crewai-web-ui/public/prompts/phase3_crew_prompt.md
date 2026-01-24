
Use the JSON objects provided as the single source of truth. Your task is to generate the content of the main Python file `crew.py` that defines all programmatic components and assembles the `CrewBase` class. This file must be valid, executable Python code following the structure of the CrewAI library recommendations.

No explanation should be provided, only the Python code.

#### **1. Environment Setup (Order is CRITICAL)**

**Core Imports:**
Start with these imports. Add others only if strictly necessary.

```python
import os
import json
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv()) # MUST BE CALLED EARLY
from crewai import Agent, Task, Crew, Process
from crewai import LLM
from pydantic import BaseModel, Field, RootModel
from typing import List, Optional

from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent

from mcp import StdioServerParameters
```

**Tool Imports:**
*   **Identify Tools:** Iterate through the `tool_repository` list. For each entry, process the `tools` list.
*   **Canonical Tools:** If a tool has `canonical_tool` defined, add its `class_name` to the `crewai_tools` import list (deduplicate these imports).
    *   **Example:** `from crewai_tools import MCPServerAdapter, FileWriterTool`
*   **Custom Tools:** If a tool has `custom_tool` defined:
    *   **Module Name:** Use `design_metadata.tool_id` (ensure it is a valid filename).
    *   **Class Name:** Use `custom_tool.class_name`.
    *   **Pattern:** `from .tools.<design_metadata.tool_id> import <class_name>`
    *   **Example:** `from .tools.perform_sentiment_analysis import CustomSentimentAnalyzerTool`

#### **2. API Key Access**
*   Use `os.getenv("VARIABLE_NAME")` for all secrets. Do NOT hardcode API keys.

#### **3. LLM Instantiation**
Use the `crewai.LLM` class. Iterate through the `llm_registry` list.
*   **Variable Name**: `<llm_id>_llm`. Sanitize the ID (replace `/`, `-` with `_`).
*   **Constructor**: Use `constructor_args` from the JSON.
*   **Seed**: Always set `seed=2`.

**Example:**
```python
# LLM Instantiation
gemini_2_5_flash_llm = LLM(
    model="gemini/gemini-2.5-flash",
    timeout=600,
    api_key=os.getenv("GEMINI_API_KEY"),
    max_tokens=8192,
    seed=2
)
```

#### **4. Tool Instantiation**

**Global Instantiation (Canonical/MCP):**
Iterate through the `tool_repository`. For each task entry, iterate through its `tools`. If a tool is `canonical_tool` (including MCP adapters), instantiate it here.
*   **Variable Naming:** Create a variable name using `design_metadata.tool_id` (e.g., `get_current_utc_time_tool`).
*   **MCP Adapters:**
    *   If `class_name` is `MCPServerAdapter`:
        1.  Extract `command` and `args` from `initialization_params.serverparams`.
        2.  Create `StdioServerParameters`.
        3.  Instantiate `MCPServerAdapter` with these parameters.
*   **Other Canonical Tools:**
    *   Instantiate using `initialization_params` as constructor arguments.

**Example:**
```python
# Tool Instantiation
# Tool ID: get_current_utc_time
get_current_utc_time_params = StdioServerParameters(
    command="uvx",
    args=["mcp-server-time"]
)
get_current_utc_time_tool = MCPServerAdapter(get_current_utc_time_params)

# Tool ID: html_file_writer
html_file_writer_tool = FileWriterTool(file_path="/workspace/output/report.html")
```

#### **5. CrewBase Definition**
Define the class annotated with `@CrewBase`.

```python
@CrewBase
class CrewaiGenerated:
    """Generated crew"""
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    agents: List[BaseAgent]
    tasks: List[Task]
```

#### **6. @agent Methods**
Iterate through `agent_cadre`.
*   **Name**: `yaml_definition.yaml_id`.
*   **Return**: `Agent` instance.
*   **Config**: `self.agents_config['<yaml_id>']`.
*   **LLM**: Assign the matching pre-instantiated LLM variable.

**Example:**
```python
    @agent
    def news_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config['news_researcher'],
            llm=gemini_2_5_flash_llm
        )
```

#### **7. @task Methods**
Iterate through `task_roster`.
*   **Name**: `yaml_definition.yaml_id`.
*   **Return**: `Task` instance.
*   **Config**: `self.tasks_config['<yaml_id>']`.
*   **Tools**:
    1.  Find the entry in `tool_repository` where `task_identifier` matches `yaml_definition.yaml_id`.
    2.  If found, iterate through that entry's `tools` list.
    3.  **For Custom Tools:**
        *   Add `tool_var` to the `tools` list.
    4.  **For Canonical/MCP Tools:**
        *   Reference the global variable created in **Section 4**. Match using `design_metadata.tool_id` (e.g., `get_current_utc_time_tool`).
        *   **MCP Special Case:** If it's an `MCPServerAdapter`, you **MUST** unpack its tools property: `*<tool_variable>.tools`.
        *   **Standard Canonical:** Add the variable directly.

**Example:**
```python
    @task
    def fetch_latest_news(self) -> Task:
        return Task(
            config=self.tasks_config['fetch_latest_news'],
            tools=[tool_var, *get_current_utc_time_tool.tools] # Add tools variables to the task
        )
```

#### **8. Callbacks**
Define the following methods to track execution state in real-time.

```python
    def step_callback(self, step_output):
        try:
            log_entry = {
                "type": "step",
                "content": str(step_output)
            }
            with open('execution_log.json', 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception:
            pass

    def task_callback(self, task_output):
        try:
            log_entry = {
                "type": "task",
                "content": str(task_output)
            }
            with open('execution_log.json', 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception:
            pass
```

#### **9. @crew Method**
Assemble the crew using the defined agents and tasks.
*   **Process**: Use `workflow_process.selected_process` (e.g., `Process.sequential` or `Process.hierarchical`).
*   **Manager LLM**: If `workflow_process.selected_process` is hierarchical, assign the correct pre-instantiated LLM object.
*   **Memory**: Use `crew_memory.activation`.
*   **Embedder**: If memory is active, configure the embedder based on `crew_memory`.
*   **Callbacks**: ALWAYS register `self.step_callback` and `self.task_callback`.

**Example:**
```python
    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            manager_llm=<select_a_llm_from_llm_registry>, # If hierarchical, assign the correct pre-instantiated LLM object.
            memory=False,
            verbose=True,
            step_callback=self.step_callback,
            task_callback=self.task_callback
        )
```