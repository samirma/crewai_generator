* **Instruction:** Use the full 'Design-Crew-Architecture-Plan' JSON as your sole source of truth.
* **Objective:** Your task is to generate the complete Python code for the `crew.py` file. This script will define and instantiate components not supported by YAML (like LLMs and Tools) and then assemble the `Crew` object, pointing it to the YAML configuration for agents and tasks.
* **Final Output Format:** Your entire response must be a single Python code block enclosed in ```python ... ```. Do not include any other text or explanations before or after the code block.

---

### **Python Code Generation Rules**

**1. Environment Setup & Imports:**
*   Generate standard imports: `os`, `load_dotenv`, `Crew`, `Process`.
*   Import `LLM` from `crewai_tools`.
*   Import `BaseModel`, `Field`, `RootModel` from `pydantic`.
*   Import `List`, `Optional` from `typing`.
*   Conditionally import tool classes from `crewai_tools` and `agent_code.tools.custom_tools` based on the JSON content.
*   Conditionally import `MCPServerAdapter` and `StdioServerParameters` if required.

**2. LLM Instantiation:**
*   Iterate through the `llm_registry` and generate Python variables for each LLM instance using the `LLM` class from `crewai_tools`.

**3. Reusable RAG and Embedder Configuration:**
*   If `crew_memory.activation` is `true`, generate the `embedder_config` and `rag_config` dictionaries.

**4. Tool Instantiation:**
*   Iterate through `tool_repository` and generate Python variables for each tool instance, handling standard tools, RAG-enabled tools, and MCP Server tools correctly.

**5. Pydantic Model Definitions:**
*   Iterate through `pydantic_model_definitions` and generate the required Pydantic model classes.

**6. Crew Assembly (CRITICAL):**
*   Create an instance of the `Crew` class, named `my_crew`.
*   `agents`: Use the string path `"config/agents.yaml"`. This tells `crewai` to load agent definitions from the YAML file.
*   `tasks`: Use the string path `"config/tasks.yaml"`. This tells `crewai` to load task definitions from the YAML file.
*   `tools`: Assign a Python list containing all the instantiated tool variables. This makes the Python tool objects available to the agents defined in the YAML files.
*   `process`: Set based on `workflow_process.selected_process`.
*   `manager_llm`: If the process is hierarchical, assign the correct pre-instantiated LLM variable.
*   `memory`: Set based on `crew_memory.activation`.
*   `embedder`: If memory is active, assign the `embedder_config` dictionary.
*   `verbose`: Set to `True`.

### **Example Snippet (Crew Assembly)**
```python
# (imports, llms, tools, pydantic models defined above)

my_crew = Crew(
    agents="config/agents.yaml",
    tasks="config/tasks.yaml",
    process=Process.sequential,
    verbose=True,
    memory=True,
    embedder={
        "provider": "ollama",
        "config": {
            "model": "mxbai-embed-large:latest",
            "base_url": f"http://{os.getenv('OLLAMA_HOST', 'localhost:11434')}"
        }
    },
    tools=[search_tool, file_writer_tool, custom_scraper_tool] # Pass all tool instances here
)
```