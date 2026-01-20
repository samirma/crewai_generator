pyproject.toml Generation Logic:

You will be provided with one or more Python code files. Your task is to analyze these files and generate the content for a single `pyproject.toml` file that defines the project's dependencies and scripts.

Objective: Analyze the provided Python code to identify all imported libraries and create a `pyproject.toml` file with the correct dependencies and entry points.

Input: One or more blocks of Python code, each prefixed with its file path (e.g., `File: src/crewai_project/main.py`).

Analysis:

1.  **Dependency Scanning**: Scan all `import` and `from ... import ...` statements in the Python code.
2.  **Package Mapping**: Identify the PyPI package for each import.
    *   Example: `from crewai_tools import SerperDevTool` -> dependency is `crewai-tools`.
    *   Example: `from dotenv import load_dotenv` -> dependency is `python-dotenv`.
    *   Example: `from duckduckgo_search import DDGS` -> dependency is `duckduckgo-search`.
3.  **Ignore Standard Libraries**: Do NOT include standard Python libraries (e.g., `os`, `sys`, `json`, `datetime`, `subprocess`, `typing`).
4.  **Project Name Inference**: Look at the file path of `main.py`. The parent directory of `main.py` is usually the python package name.
    *   Example: if file is `src/my_awesome_crew/main.py`, the package name is `my_awesome_crew`.
    *   Use this name for the `[project.scripts]` entries (e.g., `my_awesome_crew.main:run`).

Content Generation:

The generated file MUST be a valid `pyproject.toml`.

It must include the `[project]` section with standard metadata.

The `dependencies` array inside `[project]` must include:

**Mandatory Dependencies** (Must always be present):
*   "crewai[google-genai,tools]>=1.3.0"
*   "crewai-tools[mcp]"
*   "fastmcp"
*   "litellm>=1.80.9"
*   "zeroconf"
*   "ollama"
*   "streamlit"

**Extra Dependencies**:
*   You should evaluate the imports and identify any other and only the external python libraries you need to run the code.

Formatting:
The entire output must be a single, valid TOML file content inside a markdown block. Do not include any other text before or after.

Example `pyproject.toml` Output:

```toml
[project]
name = "crewai_generated"
version = "0.1.0"
description = "crewai_generated using crewAI"
authors = [{ name = "Your Name", email = "you@example.com" }]
requires-python = ">=3.10,<3.14"
dependencies = [
    "crewai[google-genai,tools]",
    "crewai-tools[mcp]",
    "fastmcp",
    "litellm>=1.80.9",
    "zeroconf",
    "ollama",
    "python-dotenv", # Example extra dependency
]

[project.scripts]
crewai_generated = "crewai_generated.main:run"
run_crew = "crewai_generated.main:run"
train = "crewai_generated.main:train"
replay = "crewai_generated.main:replay"
test = "crewai_generated.main:test"
run_streamai = "crewai_generated.main:run_streamai"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.crewai]
type = "crew"
```