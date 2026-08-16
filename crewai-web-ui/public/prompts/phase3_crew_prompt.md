
Use the JSON objects provided as the single source of truth. Your task is to generate the content of the main Python file `crew.py` that defines all programmatic components and assembles the `CrewBase` class. This file must be valid, executable Python code following current CrewAI library recommendations.

No explanation should be provided, only the Python code.

#### **1. Environment Setup (Order is CRITICAL)**

**Core structure:**
Start the file exactly like this. The telemetry environment variables MUST be set BEFORE any `crewai` import (they are read at import time).

```python
import os

# Telemetry off — MUST precede any crewai import
os.environ["OTEL_SDK_DISABLED"] = "true"
os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"
os.environ["CREWAI_TELEMETRY"] = "false"

import json
from typing import List

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

from crewai import Agent, Crew, LLM, PlanningConfig, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.mcp import MCPServerStdio, create_static_tool_filter
```

*   Omit `from crewai.mcp import ...` entirely when the `tool_repository` contains no MCP servers. Omit `PlanningConfig` from the `crewai` import when no agent has `reasoning: true`.
*   **Memory-only block:** ONLY when `crew_memory.activation` is `true`, add immediately after the imports above:

```python
from pathlib import Path

# Memory enabled: pin the ONNX embedder to the pre-downloaded local model
import chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 as onnx_embed_module
onnx_embed_module.ONNXMiniLM_L6_V2.DOWNLOAD_PATH = Path("/workspace/onnx_model")
```

When `crew_memory.activation` is `false`, this block (and the `pathlib` import) MUST be omitted.
*   **Forbidden strings:** the generated code must NEVER print the strings `Crew Execution successful` or `Crew Execution failed` — they are reserved runner markers parsed by the application.

**Tool Imports:**
*   **Identify Tools:** Iterate through the `tool_repository` list. For each entry, process the `tools` list.
*   **Canonical (non-MCP) Tools:** If a tool has `canonical_tool` defined and its `class_name` is NOT `MCPServerAdapter`, add its `class_name` to the `crewai_tools` import list (deduplicate these imports).
    *   **Example:** `from crewai_tools import FileWriterTool, FileReadTool`
    *   Do NOT import `MCPServerAdapter` and do NOT import `mcp` — MCP servers use `MCPServerStdio` from `crewai.mcp` (already imported above).
*   **Custom Tools:** If a tool has `custom_tool` defined:
    *   **Module Name:** Use `design_metadata.tool_id` (ensure it is a valid filename).
    *   **Class Name:** Use `custom_tool.class_name`.
    *   **Pattern:** `from .tools.<design_metadata.tool_id> import <class_name>`
    *   **Example:** `from .tools.perform_sentiment_analysis import CustomSentimentAnalyzerTool`

#### **2. API Key Access**
*   Use `os.getenv("VARIABLE_NAME")` for all secrets. Do NOT hardcode API keys.

#### **3. LLM Instantiation**
Use the `crewai.LLM` class. Iterate through the `llm_registry` list.
*   **Variable Name**: `<sanitized_llm_id>_llm`, where `sanitized_llm_id` is the `llm_id` lowercased with EVERY character outside `[a-z0-9_]` replaced by `_` (this covers `/`, `-`, `.`, `:`, and anything else; prefix with `m_` if it would start with a digit).
*   **Constructor**: Pass through ALL keys of `constructor_args` verbatim — including `base_url` when present. The `api_key` value is an environment variable NAME: wrap it as `os.getenv("<value>")`.
*   **Seed**: Always add `seed=2`.

**Example:**
```python
# LLM Instantiation
qwen3_8_27b_mlx_llm = LLM(
    model="ollama/qwen3.8:27b-mlx",
    timeout=600,
    api_key=os.getenv("OLLAMA_API_KEY"),
    base_url="http://localhost:11434",
    seed=2,
)
```

#### **4. Tool Instantiation (module level)**

**4a. MCP Server Configs:**
Collect every tool whose `canonical_tool.class_name` is `MCPServerAdapter` (the MCP marker) across the WHOLE `tool_repository`. Group them by identical `initialization_params.serverparams` (`command` + `args`). For each DISTINCT server emit ONE `MCPServerStdio` config at module level. These configs are inert (no process is spawned until the crew runs), so module level is safe.
*   **Variable Naming:** a short snake_case name derived from the server (e.g., `time_mcp`, `search_crawl_mcp`).
*   **Tool filter:** the union of `canonical_tool.mcp_tool_names` across all grouped entries. If ANY grouped entry has no `mcp_tool_names`, omit `tool_filter` entirely for that server.

**Example:**
```python
# MCP server configs (lazy — connected only at kickoff)
time_mcp = MCPServerStdio(
    command="python",
    args=["-m", "mcp_server_time"],
    tool_filter=create_static_tool_filter(
        allowed_tool_names=["get_current_time"],
    ),
)

search_crawl_mcp = MCPServerStdio(
    command="python",
    args=["/workspace/mcp/mcp_search_crawl.py"],
    tool_filter=create_static_tool_filter(
        allowed_tool_names=["perform_web_search", "crawl_single_url"],
    ),
)
```

**4b. Canonical (non-MCP) Tools:**
Instantiate one module-level variable per tool, named `<design_metadata.tool_id>_tool`, using `initialization_params` as constructor keyword arguments.
*   **`FileWriterTool` takes NO constructor arguments** — the path is a runtime `_run` argument supplied by the agent. Instantiate it as `FileWriterTool()`. The same applies to `FileReadTool()`.

**4c. Custom Tools:**
Instantiate each imported custom tool class once at module level: `<design_metadata.tool_id>_tool = <ClassName>()`.

**Example:**
```python
# Tool ID: html_file_writer
html_file_writer_tool = FileWriterTool()

# Tool ID: perform_sentiment_analysis (custom)
perform_sentiment_analysis_tool = CustomSentimentAnalyzerTool()
```

#### **5. Callbacks (module level)**
Define these two MODULE-LEVEL functions (NOT methods — bound methods break CrewAI checkpoint serialization), after the tool instantiations and before the class. Keep the JSON shape and the relative path exactly as shown — the application polls this file.

```python
def log_step(step_output):
    try:
        log_entry = {
            "type": "step",
            "content": str(step_output)
        }
        with open('execution_log.json', 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    except Exception:
        pass


def log_task(task_output):
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

#### **6. CrewBase Definition**
Define the class CrewaiGenerated annotated with `@CrewBase`.

```python
@CrewBase
class CrewaiGenerated:
    """Generated crew"""
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    agents: List[BaseAgent]
    tasks: List[Task]
```

#### **7. @agent Methods**
Iterate through `agent_cadre`.
*   **Name**: `yaml_definition.yaml_id`.
*   **Return**: `Agent` instance.
*   **Config**: `self.agents_config['<yaml_id>']`.
*   **LLM**: Assign the pre-instantiated LLM variable selected for this agent in `agent_llm` (match on `yaml_id`, then use the sanitized `llm_id`).
*   **MCP servers**: Collect the tasks assigned to this agent (`task_roster` entries whose `yaml_definition.agent` equals this agent's `yaml_id`). The agent's `mcps` list is the deduplicated set of `MCPServerStdio` variables needed by those tasks' `tool_repository` entries. Omit `mcps=` entirely when the set is empty.
*   **Planning**: If this agent's `yaml_definition.reasoning` is `true` in `agent_cadre`, add `planning_config=PlanningConfig()`. NEVER pass `reasoning=` (deprecated).
*   **Verbose**: Always `verbose=True`.

**Example:**
```python
    @agent
    def news_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config['news_researcher'],
            llm=qwen3_8_27b_mlx_llm,
            mcps=[search_crawl_mcp, time_mcp],
            planning_config=PlanningConfig(),
            verbose=True,
        )
```

(In this example the agent had `reasoning: true`; omit `planning_config=` for agents with `reasoning: false`, and omit `mcps=` for agents whose tasks need no MCP server.)

#### **8. @task Methods**
Iterate through `task_roster`.
*   **Name**: `yaml_definition.yaml_id`.
*   **Return**: `Task` instance.
*   **Config**: `self.tasks_config['<yaml_id>']`.
*   **Tools**:
    1.  Find the entry in `tool_repository` where `task_identifier` matches `yaml_definition.yaml_id`.
    2.  If found, iterate through that entry's `tools` list and collect ONLY the non-MCP tools (canonical tools whose `class_name` is not `MCPServerAdapter`, and custom tools), referencing the module-level `<tool_id>_tool` variables from Section 4.
    3.  MCP capability comes from the agent's `mcps` (Section 7) — NEVER put MCP servers on a task and NEVER unpack `.tools` of anything.
    4.  Omit `tools=` entirely when the task has no non-MCP tools.

**Example:**
```python
    @task
    def write_and_verify_file(self) -> Task:
        return Task(
            config=self.tasks_config['write_and_verify_file'],
            tools=[html_file_writer_tool, html_file_verifier_tool],
        )

    @task
    def fetch_latest_news(self) -> Task:
        return Task(
            config=self.tasks_config['fetch_latest_news'],
        )
```

#### **9. @crew Method**
Assemble the crew using the defined agents and tasks.
*   **Process**: Use `workflow_process.selected_process`.
*   **Manager LLM**: ONLY if `selected_process` is `Process.hierarchical`, add `manager_llm=<sanitized_llm_id>_llm`, choosing an `llm_registry` entry with `reasoner: true`. NEVER include `manager_llm` for `Process.sequential`.
*   **Memory**: Use `crew_memory.activation`. When `true`: `memory=True` plus `embedder={"provider": "onnx"}` (and include the memory-only block from Section 1). When `false`: `memory=False` and no `embedder=`.
*   **Verbose**: `verbose=True` is MANDATORY (the application parses task output lines from stdout).
*   **Callbacks**: ALWAYS register the module-level functions: `step_callback=log_step, task_callback=log_task`.

**Example (sequential, memory off):**
```python
    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            memory=False,
            verbose=True,
            step_callback=log_step,
            task_callback=log_task,
        )
```

CRITICAL OUTPUT FORMAT: Your entire response must be ONLY the raw Python content of `crew.py` — no markdown fences, no explanations, no text before or after. The response is written to disk verbatim.
