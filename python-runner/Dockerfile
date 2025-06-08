# python-runner/Dockerfile
FROM python:3.10-slim

# Set working directory
WORKDIR /workspace

# Install build-essential for gcc and other development tools
RUN apt-get update && apt-get install -y git build-essential vim  && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

# Install crewai and crewai-tools
# Ensure these are the latest versions or specific versions as per requirements
RUN pip install --no-cache-dir crewai crewai-tools

# Copy the script that will be run (the script itself will be mounted at runtime)
# CMD ["python", "script_to_run.py"]
# We will provide the script name dynamically when running the container
