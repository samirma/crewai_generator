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
├── workspace/mcp/            # MCP (Model Context Protocol) servers
│   ├── config.json           # MCP client configuration
│   ├── server_config.ini     # MCP server connection settings
│   └── *.py                  # MCP server implementations
├── docker-compose.mcp.yml    # Docker Compose for MCP services
├── crewai_generated/         # (Generated) The resulting CrewAI project lives here
├── docker-compose.yml        # Orchestration for the web app
└── README.md
```

## Known Limitations

*   **Resource Usage**: Running multiple LLM generations and Docker containers simultaneously can be resource-intensive.
*   **Ollama Connectivity**: Connecting to a local Ollama instance from Docker requires proper networking configuration (use the Host Networking steps above for Mac).
*   **Manual Build**: The `python-runner` image must be built manually before the first run.

---

## MCP Server Setup

This project includes MCP (Model Context Protocol) servers that provide additional capabilities like web search, web crawling, document conversion, and more.

### MCP Services Overview

The following MCP services are available:

| Service | Description | Port | Required For |
|---------|-------------|------|--------------|
| **SearxNG** | Privacy-respecting metasearch engine | 8080 | `mcp_search_crawl.py` - Web search functionality |
| **Crawl4AI** | Web crawling and content extraction | 11235 | `mcp_search_crawl.py` - Web page crawling |
| **Kimi Server** | OpenAI-compatible API proxy for Kimi | 3050 | LLM API proxy |
| **Playwright** | Browser automation | N/A (local) | `config.json` - Browser-based operations |
| **Excel MCP** | Excel file operations | N/A (local) | `config.json` - Spreadsheet processing |
| **Pandoc** | Document format conversion | N/A (local) | `mcp_pandadoc_converter.py` - File conversions |

### MCP Configuration Files

- `workspace/mcp/config.json` - MCP server configurations for clients
- `workspace/mcp/server_config.ini` - Server connection settings

### Building and Starting MCP Services

#### 1. Start External MCP Services (SearxNG & Crawl4AI)

From the **project root directory**:

```bash
# Build and start the MCP services
docker compose -f docker-compose.mcp.yml up -d

# Or to start with logs visible
docker compose -f docker-compose.mcp.yml up
```

This will start:
- **SearxNG** at http://localhost:8080
- **Crawl4AI** at http://localhost:11235
- **Kimi Server** at http://localhost:3050

#### 2. Verify Services are Running

```bash
# Check service status
docker compose -f docker-compose.mcp.yml ps

# Check SearxNG health
curl http://localhost:8080/healthz

# Check Crawl4AI health
curl http://localhost:11235/health

# Check Kimi Server
curl -X POST http://localhost:3050/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "kimi", "messages": [{"role": "user", "content": "Hello"}]}'
```

#### 3. Configure Server Connection

Update `workspace/mcp/server_config.ini` with the correct IP if not using localhost:

```ini
[DEFAULT]
# Use 'localhost' when running MCP Python scripts locally
# Use the Docker host IP (e.g., '192.168.1.x') when MCP scripts run in containers
server_ip = localhost
searxng_port = 8080
crawl4ai_port = 11235
```

### Stopping MCP Services

```bash
# Stop services but keep data
docker compose -f docker-compose.mcp.yml stop

# Stop and remove containers (data persists in volumes)
docker compose -f docker-compose.mcp.yml down

# Stop and remove everything including volumes (⚠️ deletes all data)
docker compose -f docker-compose.mcp.yml down -v
```

### Environment Variables

Create a `.env` file in the project root for configuration:

```env
# SearxNG configuration
SEARXNG_SECRET_KEY=your-secret-key-here

# Crawl4AI configuration (REQUIRED for API authentication)
CRAWL4AI_API_TOKEN=mcp-crawl4ai-token

# Kimi Server configuration (REQUIRED)
KIMI_API_KEY=your-kimi-api-key

# Optional: AI-powered extraction in Crawl4AI
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

**Note**: 
- The `CRAWL4AI_API_TOKEN` is required for Crawl4AI to work. The default value `mcp-crawl4ai-token` is pre-configured in both `docker-compose.mcp.yml` and `workspace/mcp/server_config.ini`. If you change it, make sure to update both files.
- The `KIMI_API_KEY` is required for the Kimi Server to proxy requests to the Kimi API.

### Local MCP Servers (No Docker Required)

The following MCP servers run locally and don't require Docker:

| Server | Command | Requirements |
|--------|---------|--------------|
| **Playwright** | `npx -y @playwright/mcp@latest` | Node.js, npx |
| **Excel** | `uvx excel-mcp-server stdio` | uv/uvx |
| **Pandoc** | `python workspace/mcp/mcp_pandadoc_converter.py` | Python, pypandoc |
| **Search & Crawl** | `python workspace/mcp/mcp_search_crawl.py` | Python, httpx |

These are configured in `workspace/mcp/config.json` and started automatically by MCP clients.

### Troubleshooting

**SearxNG not responding:**
```bash
# Check logs
docker logs mcp-searxng

# Restart service
docker compose -f docker-compose.mcp.yml restart searxng
```

**Crawl4AI connection issues:**
```bash
# Check logs
docker logs mcp-crawl4ai

# Ensure the service is fully started (may take 30-60s)
docker compose -f docker-compose.mcp.yml ps
```

**MCP scripts can't connect to services:**
- Ensure `server_ip` in `server_config.ini` matches your setup:
  - Use `localhost` if running MCP scripts directly on the host
  - Use the Docker bridge IP (e.g., `172.17.0.1`) if MCP scripts run in containers
  - Use the service name (e.g., `mcp-searxng`) only if running within the same Docker network

### Web UI Management

The MCP services can be managed directly from the web interface:

1. Navigate to the main page of the CrewAI Web UI
2. Look for the **MCP Services** panel at the top
3. Use the controls to:
   - **Start/Stop All Services** - Control all MCP services at once
   - **Individual Controls** - Start, stop, or restart each service independently
   - **View Status** - See real-time status with health indicators
   - **Auto-refresh** - Status updates every 10 seconds

The panel shows:
- 🔍 **SearxNG Search** (Port 8080) - Web search functionality
- 🕷️ **Crawl4AI Crawler** (Port 11235) - Web page crawling
- 🤖 **Kimi API Server** (Port 3050) - OpenAI-compatible API proxy

### Testing the MCP Setup

To verify that the MCP services are working correctly:

```bash
# Test SearxNG search
curl "http://localhost:8080/search?q=docker&format=json" | head -c 200

# Test Crawl4AI health
curl http://localhost:11235/health

# Test Kimi Server
curl -X POST http://localhost:3050/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer KIMI_API_KEY" \
  -d '{"model": "kimi", "messages": [{"role": "user", "content": "Hello"}]}'

# Test the MCP Python script directly
cd workspace/mcp
python3 -c "
import asyncio
import mcp_search_crawl as mcp

async def test():
    # Test search
    result = await mcp.perform_web_search('docker containers')
    print('Search works!' if 'docker' in result.lower() else 'Search failed')
    
    # Test crawl
    result = await mcp.crawl_single_url('https://example.com')
    print('Crawl works!' if 'example' in result.lower() else 'Crawl failed')

asyncio.run(test())
"
```

---

# Docker test
```bash
docker run -it --rm --name my-python-runner -v "./workspace:/workspace" --network="host" python-runner:latest bash
```


# Docker test with jupyter lab
```bash
docker run -it --rm  -v "./workspace:/workspace" --network="host" -p 8888:8888 python-runner:latest jupyter lab --ip=0.0.0.0 --port=8888 --allow-root --no-browser --notebook-dir=/workspace --NotebookApp.token='' --NotebookApp.password=''
```


http://127.0.0.1:8888/lab
