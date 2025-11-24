# CrewAI Web Interface

## Overview

This project provides a sophisticated web interface to automate the process of generating and running `crewai` Python projects. Unlike simple script generators, this system employs a multi-phase pipeline that progresses from high-level blueprints to detailed architecture, and finally to a fully structured, executable `crewai` project (complete with `agents.yaml`, `tasks.yaml`, `crew.py`, etc.).

Users provide an initial instruction, select an LLM, and the system orchestrates a series of LLM calls to build the project step-by-step. The generated project is then executed in a robust, Dockerized environment with support for standard and custom tools.

## Current Features

*   **Frontend**: Modern UI built with Next.js (v13+ App Router), TypeScript, and Tailwind CSS.
*   **Multi-Phase Generation Pipeline**:
    *   **Blueprint Definition**: Converts user input into a detailed instruction document.
    *   **Architecture Design**: Defines agents, tasks, tools, and workflows based on the blueprint.
    *   **Code Generation**: Generates specific files (`agents.yaml`, `tasks.yaml`, `crew.py`, `main.py`, `tools/`, `pyproject.toml`) to create a standard `crewai` project structure.
*   **LLM Support**:
    *   **Gemini**: Fully integrated.
    *   **DeepSeek**: Fully integrated.
    *   **Ollama**: Supports local models via Ollama server.
    *   **ChatGPT**: Placeholder for future integration.
*   **Parallel & Sequential Generation**: Options to generate phases sequentially or in parallel (where dependencies allow) for faster results.
*   **Project Execution**:
    *   **Dockerized Environment**: Runs generated projects in an isolated `python-runner` container.
    *   **Virtual Environment**: Uses a Python virtual environment (`/opt/venv`) for dependency management.
    *   **Pre-installed Tools**: Includes `crewai`, `crewai-tools`, and common libraries.
*   **Interactive UI**:
    *   **Phase Summary**: Visual progress tracking of generation phases.
    *   **File Explorer**: View generated project files.
    *   **Execution Output**: Real-time display of script `stdout` and `stderr`.

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Configure Environment Variables
Navigate to the `crewai-web-ui` directory and create your environment file:
```bash
cd crewai-web-ui
cp ../.env_sample .env.local
```

Edit `.env.local` with your API keys:
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
DEEPSEEK_API_KEY="YOUR_DEEPSEEK_API_KEY"
OLLAMA_API_BASE_URL="http://localhost:11434" # Optional for local Ollama
```

### 3. Build the Python Execution Environment
From the **project root directory**:
```bash
sudo docker build -t python-runner ./python-runner
```
*This builds the execution environment with all necessary dependencies.*

### 4. Build and Run the Web Application
From the **project root directory**:
```bash
sudo docker compose build web
sudo docker compose up web
```
Access the application at `http://localhost:3000`.

### 5. (Optional) Enable Host Networking for Ollama on Mac
**Scenario C: You just want "Host Networking" to work**

If you absolutely must have host networking (e.g., you need to open specific UDP ports or handle complex networking protocols), Docker Desktop for Mac recently added a beta feature for this.

1.  Open **Docker Desktop Dashboard**.
2.  Go to **Settings** (gear icon) -> **Resources** -> **Network**.
3.  Check "**Enable host networking**".
4.  **Restart Docker**.

This allows the container to access your host's network directly, making it easier to connect to a local Ollama instance running on your Mac.

## How it Works: The Generation Pipeline

The application uses a structured pipeline defined in `src/config/phases.config.ts`:

1.  **Blueprint Definition**: The user's input is expanded into a comprehensive "Detailed Instruction Document".
2.  **Detailed Agent & Task Definition**: The blueprint is used to define specific agents and tasks.
3.  **Architecture & Workflow**: The system designs the interaction flow and selects appropriate tools (including custom ones).
4.  **Code Generation**:
    *   **Configuration**: `agents.yaml` and `tasks.yaml` are generated.
    *   **Logic**: `crew.py` (orchestration) and `main.py` (entry point) are created.
    *   **Tools**: Custom tools are generated in the `tools/` directory.
    *   **Project**: A `pyproject.toml` is created to manage dependencies.
5.  **Execution**: The fully assembled project in `/workspace/crewai_generated` is executed using `crewai run` inside the `python-runner` container.

## Project Structure

```
.
├── crewai-web-ui/            # Next.js frontend application
│   ├── src/config/           # Phase definitions and configuration
│   ├── src/hooks/            # Custom hooks (usePhases, useExecution, etc.)
│   ├── src/app/              # Next.js App Router pages and API routes
│   └── ...
├── python-runner/            # Docker environment for executing CrewAI projects
│   └── Dockerfile            # Defines the execution image with dependencies
├── crewai_generated/         # (Generated) The resulting CrewAI project lives here
├── docker-compose.yml        # Orchestration for the web app
└── README.md
```

## Known Limitations

*   **Resource Usage**: Running multiple LLM generations and Docker containers simultaneously can be resource-intensive.
*   **Ollama Connectivity**: Connecting to a local Ollama instance from Docker requires proper networking configuration (use the Host Networking steps above for Mac).
*   **Manual Build**: The `python-runner` image must be built manually before the first run.

# Docker test
```bash
docker run -it --rm --name my-python-runner -v "./workspace:/workspace" --network="host" python-runner:latest bash
```


# Docker test with jupyter lab
```bash
docker run -it --rm  -v "./workspace:/workspace" --network="host" -p 8888:8888 python-runner:latest jupyter lab --ip=0.0.0.0 --port=8888 --allow-root --no-browser --notebook-dir=/workspace --NotebookApp.token='' --NotebookApp.password=''
```

http://127.0.0.1:8888/lab
