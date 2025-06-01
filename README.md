# CrewAI Web Interface

## Overview

This project provides a web interface to automate the process of generating and running `crewai` Python scripts. Users can provide an initial instruction, select an LLM, and the system will use a meta-prompt (from `crewai_reference.md`) along with the user's input to generate a Python script. This script is then executed in a Dockerized environment, and the results (generated script and its output) are displayed in the web UI.

## Current Features

*   **Frontend**: Built with Next.js (v13+ with App Router), TypeScript, and Tailwind CSS.
*   **User Input**: Text area for users to provide their initial instructions for the `crewai` task.
*   **LLM Selection**: Dropdown to select the Large Language Model for script generation.
    *   **Gemini**: Fully integrated for script generation.
    *   **DeepSeek**: Fully integrated for script generation.
    *   **Ollama**: Supports listing and using models from a local Ollama server.
    *   ChatGPT: UI option exists but is a placeholder.
*   **Independent Script Execution**: A 'Run Script' button allows re-running the generated Python script independently of the LLM generation process.
*   **Backend API**: Next.js API routes (`/api/generate`, `/api/execute`) handle communication with LLMs and script execution.
*   **Meta-Prompt Usage**: Utilizes `crewai_reference.md` as a base meta-prompt for script generation.
*   **Python Script Generation**: Currently uses Google's Gemini (`gemini-pro`) to generate Python scripts.
*   **Dockerized Python Execution**:
    *   Generated Python scripts are executed in an isolated Docker container (`python-runner`).
    *   This environment has `crewai` and `crewai-tools` (latest versions at time of setup) installed.
    *   Uses `dockerode` library in the Next.js backend to manage Docker container lifecycle (create, run, capture output, remove).
*   **Output Display**: The web UI displays the LLM-generated Python script and its captured `stdout` and `stderr`.
*   **Docker Compose**: `docker-compose.yml` is provided to build and run the Next.js web application service.

## Setup Instructions

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Environment Variables**:
    *   Navigate to the Next.js application directory:
        ```bash
        cd crewai-web-ui
        ```
    *   Copy the sample environment file. The `.env_sample` is located in the project root.
        ```bash
        cp ../.env_sample .env.local
        ```
    *   Edit `.env.local` and fill in your API keys:
        ```env
        GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE" # Required for Gemini models
        OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE_PLACEHOLDER" # Placeholder for future ChatGPT integration
        DEEPSEEK_API_KEY="YOUR_DEEPSEEK_API_KEY_HERE" # Required for DeepSeek models
        OLLAMA_API_BASE_URL="http://localhost:11434" # Optional: URL for your local Ollama API if you want to use Ollama models.
        ```
        `GEMINI_API_KEY` and `DEEPSEEK_API_KEY` are actively used. `OLLAMA_API_BASE_URL` is used if you intend to use local Ollama models.

3.  **Build the Python Execution Environment**:
    *   From the **project root directory** (not `crewai-web-ui`), run:
        ```bash
        sudo docker build -t python-runner ./python-runner
        ```
    *   This command builds the Docker image specified in `python-runner/Dockerfile`. This image is used to run the generated `crewai` scripts in an isolated environment.

4.  **Build and Run the Web Application**:
    *   Ensure you are in the **project root directory**.
    *   Build the Next.js application's Docker image:
        ```bash
        sudo docker compose build web
        ```
    *   Run the Next.js application using Docker Compose:
        ```bash
        sudo docker compose up web
        ```
        (You can add `-d` to run it in detached mode).

5.  **Access the Application**:
    *   Open your web browser and navigate to `http://localhost:3000`.

## How it Works

1.  The user enters an "Initial Instruction Input" in the web UI and selects an LLM (e.g., Gemini).
2.  The frontend sends this information to the backend API (`/api/generate`).
3.  The backend API reads the `crewai_reference.md` meta-prompt.
4.  It combines the meta-prompt with the user's input to form a complete prompt for the selected LLM.
5.  The LLM (Gemini) processes the prompt and returns a Python script.
6.  The backend API then takes this generated script:
    *   Saves it to a temporary file.
    *   Uses `dockerode` to run this script inside a new container based on the `python-runner` image.
    *   The `python-runner` container has `crewai` and `crewai-tools` pre-installed.
7.  The `stdout` and `stderr` from the script's execution within the container are captured.
8.  The backend API sends the generated script and its execution output back to the frontend.
9.  The frontend displays this information to the user.
10. The user can then click the 'Run Script' button to re-execute the displayed Python script. This sends the script content to a separate backend API endpoint (`/api/execute`) which runs the script in the same Dockerized environment and updates the 'Script Execution Output'.

## Project Structure

```
.
├── crewai-web-ui/            # Next.js application
│   ├── src/app/page.tsx      # Main frontend UI component
│   ├── src/app/api/generate/route.ts # Backend API endpoint
│   ├── Dockerfile            # Dockerfile for the Next.js app
│   ├── .env.local            # Local environment variables (user-created from .env_sample)
│   └── ...                   # Other Next.js files
├── python-runner/            # Python script execution environment
│   └── Dockerfile            # Dockerfile for the Python runner (installs crewai)
├── .env_sample               # Sample environment variables file
├── .gitignore
├── crewai_reference.md       # Meta-prompt for LLM script generation
├── docker-compose.yml        # Docker Compose file for orchestrating services
└── README.md                 # This file
```

## Current Limitations & Known Issues

*   **LLM Support**: Google's Gemini and DeepSeek models are integrated for script generation. Models from a local Ollama server can also be listed and used. The UI option for ChatGPT is currently a non-functional placeholder.
*   **Ollama Integration**: If `OLLAMA_API_BASE_URL` is configured, the UI will attempt to list models from your Ollama server. If the connection fails, an 'Ollama (API Error...)' message will be shown in the model list. Ensure your Ollama server is running and accessible.
*   **Python Runner Image**: The `python-runner` Docker image **must be built manually** by the user (`sudo docker build -t python-runner ./python-runner`) before the application can successfully execute Python scripts. The application's previous attempt to build this image on-the-fly during an API call proved unreliable in resource-constrained environments (often failing with "no space left on device" errors during `pip install`). A manual build ensures the environment is ready.
*   **Error Handling**: Basic error handling is implemented for API calls and script execution. However, it can be made more robust and user-friendly.
*   **Advanced Mode**: The "Advanced/Developer Mode" with per-phase output and LLM selection is not yet implemented.
*   **Security**: Executing code generated by LLMs carries inherent security risks. While Docker provides a level of isolation, users should be cautious, especially with complex or unfamiliar generated scripts.
*   **Initial Script Generation**: The first time generating a script after starting the application might be slower as the backend may attempt to ensure the `python-runner` Docker image is available (though manual build is now recommended).

## Future Enhancements

*   Full integration of ChatGPT and DeepSeek LLMs.
*   Implementation of the "Advanced/Developer Mode".
*   More granular error reporting and improved UI feedback for different failure states.
*   Option to save, load, and manage generated scripts.
*   Enhanced security measures for script execution.
*   Configuration options for `crewai` (e.g., selecting specific tools, agent configurations through UI).
