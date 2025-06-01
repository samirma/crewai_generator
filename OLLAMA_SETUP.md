```markdown
# Setting up Ollama for CrewAI Web UI

This guide explains how to set up Ollama to use local large language models with the CrewAI Web UI.

## 1. Install Ollama

First, you need to install Ollama on your system (Linux, macOS, or Windows).

*   **Download Ollama:** Go to [https://ollama.com/download](https://ollama.com/download) and download the appropriate version for your operating system.
*   **Follow Installation Instructions:** Run the installer and follow the on-screen instructions.

Once installed, the Ollama application typically runs in the background.

## 2. Pull Models

After installing Ollama, you need to download (pull) the specific models you want to use.

*   **Open your terminal or command prompt.**
*   **Pull a model:** Use the `ollama pull` command followed by the model name. For example, to pull the Llama 3 8B instruction-tuned model:
    ```bash
    ollama pull llama3:8b-instruct
    ```
    To pull Gemma 7B:
    ```bash
    ollama pull gemma:7b
    ```
    You can find a list of available models on the [Ollama Library](https://ollama.com/library).

*   **Wait for the download to complete.** Model files can be several gigabytes in size, so this may take some time depending on your internet connection.

## 3. Configure Environment Variable for CrewAI Web UI

The CrewAI Web UI needs to know the API endpoint of your running Ollama instance. By default, Ollama serves its API at `http://localhost:11434`.

*   **Create or open a `.env` file** in the root directory of the `crewai-web-ui` project. If you are running the application using Docker as per the main `docker-compose.yml`, you might want to add this variable to an environment file that `docker-compose` uses or directly into the `docker-compose.yml` for the `crewai-web-ui` service. For local Node.js development (e.g., running `npm run dev` inside `crewai-web-ui`), a `.env` file in the `crewai-web-ui` directory is standard.

    If you have a project-level `.env` file that is intended to be used by `docker-compose`, it might look like this in your project root:
    ```env
    # .env (project root)
    OLLAMA_API_BASE_URL=http://host.docker.internal:11434
    # Use host.docker.internal to allow the Docker container (crewai-web-ui)
    # to access Ollama running on your host machine.
    # If Ollama itself is running in Docker on the same Docker network,
    # you might use its service name, e.g., http://ollama:11434
    ```

*   **Add the `OLLAMA_API_BASE_URL` variable:**
    ```env
    OLLAMA_API_BASE_URL=http://localhost:11434
    ```
    If you are running the `crewai-web-ui` inside a Docker container (as per the provided `docker-compose.yml` in the project root) and Ollama is running on your host machine, you should use `http://host.docker.internal:11434` if your Docker version supports it (Docker Desktop typically does). This allows the container to reach services running on the host.

    Example for `crewai-web-ui/.env` or an environment file used by Docker:
    ```env
    OLLAMA_API_BASE_URL=http://host.docker.internal:11434
    ```

*   **Save the file.**

## 4. Restart CrewAI Web UI

If the CrewAI Web UI was already running, you'll need to restart it for the new environment variable to take effect.

*   If running via `docker-compose`, stop and restart the services:
    ```bash
    docker-compose down
    docker-compose up -d
    ```
*   If running locally (e.g., `npm run dev`), stop the development server and start it again.

## 5. Verify

Once restarted, the CrewAI Web UI should be able to connect to your Ollama instance.
*   Open the web UI.
*   The LLM model selection dropdown should now list the Ollama models you pulled (e.g., "Ollama Llama3 (8b-instruct)", "Ollama Gemma (7b)").
*   You should be able to select these models and use them for generating CrewAI scripts.

This completes the setup for using Ollama with the CrewAI Web UI.
```
