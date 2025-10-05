Based on the blueprint, `agents.yaml`, and `tasks.yaml`, please generate the content for the `src/agent_code/crew.py` file.

Identify any necessary tools from the `crewai_tools` library based on the "Blueprint." Import the required tools and instantiate them.

Define the `crew()` method, assigning the instantiated tools to the appropriate agents. Set the `process` (e.g., `Process.sequential`) and `verbose` level.

**Blueprint:**
{{blueprint}}

**agents.yaml:**
{{agents_yaml}}

**tasks.yaml:**
{{tasks_yaml}}