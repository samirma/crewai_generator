pyproject.toml Generation Logic:

You will be provided with one or more Python code files. Your task is to analyze these files and generate the content for a single pyproject.toml file that defines the project's dependencies.

Objective: Analyze the provided Python code to identify all imported libraries and create a pyproject.toml file with the correct dependencies.

Input: One or more blocks of Python code, each prefixed with its file path.

Analysis:

Scan all import and from ... import ... statements in the Python code.

Identify the base package for each import (e.g., from crewai_tools import SerperDevTool means the dependency is crewai-tools).

Standard Python libraries (e.g., os, sys, json, datetime) should be ignored.

Content Generation:

The generated file MUST be a valid pyproject.toml.

It must include the [project] section with standard metadata.

The dependencies array inside [project] must include:

Any other libraries you identified from the import statements. For example, if you see from dotenv import load_dotenv, you must add "python-dotenv". If you see a tool that requires a specific package (like duckduckgo-search for DuckDuckGoSearchRun), you must add it.

Formatting:
The entire output must be a single, valid TOML file content inside a markdown block. Do not include any other text before or after.

Those area the mandadoty dependencies for the dependencies section:
"crewai[google-genai,tools]>=1.3.0"
"crewai-tools[mcp]"
"fastmcp"
"litellm>=1.80.9"
"zeroconf"
"ollama"

In the Extra dependencies section, append dependencies from python code here, after evaluate them.

Example pyproject.toml Output:

```toml
[project]
name = "crewai_generated"
version = "0.1.0"
description = "crewai_generated using crewAI"
authors = [{ name = "Your Name", email = "you@example.com" }]
requires-python = ">=3.12"
dependencies = [
    # Mandadory dependencies

    # Extra dependencies 
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