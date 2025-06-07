# python-runner/Dockerfile
FROM python:3.10-slim

# Set working directory
WORKDIR /usr/src/app

# Install git for crewai dependencies that might need it
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install crewai and crewai-tools
# Ensure these are the latest versions or specific versions as per requirements
RUN pip install --no-cache-dir crewai crewai-tools

# Install python-dotenv for loading .env files
RUN pip install --no-cache-dir python-dotenv

# Copy the script that will be run (the script itself will be mounted at runtime)
# CMD ["python", "script_to_run.py"]
# We will provide the script name dynamically when running the container
