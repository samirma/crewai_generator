**`pyproject.toml` Generation Logic:**

Use the JSON object provided as the single source of truth. Your task is to generate the content for the `pyproject.toml` file.

*   **Objective:** Create a `pyproject.toml` file that defines the project's dependencies.
*   **Content:**
    *   Define the `[tool.poetry]` section with basic project information like `name`, `version`, `description`, and `authors`.
    *   Define the `[tool.poetry.dependencies]` section.
        *   Include `python = ">=3.10,<4.0"`.
        *   Include `crewai = "latest"`.
        *   Include `crewai-tools = "latest"`.
        *   Include any other dependencies required by the generated code, such as `python-dotenv`.
    *   Define the `[build-system]` section.
*   **Formatting:**
    *   The output should be a single, valid TOML file.

**Example `pyproject.toml` Output:**

```toml
[project]
name = "crewai_generated"
version = "0.1.0"
description = "crewai_generated using crewAI"
authors = [{ name = "Your Name", email = "you@example.com" }]
requires-python = ">=3.10,<3.14"
dependencies = [
    "crewai[tools]>=0.203.0,<1.0.0",
    "ollama"
]

[project.scripts]
crewai_generated = "crewai_generated.main:run"
run_crew = "crewai_generated.main:run"
train = "crewai_generated.main:train"
replay = "crewai_generated.main:replay"
test = "crewai_generated.main:test"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.crewai]
type = "crew"

```