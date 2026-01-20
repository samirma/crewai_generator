#!/bin/sh
# This script is for manually running the streamlit app in a docker container from the host.
# It matches the logic used by the Web UI but executed from the terminal.

PROJECT_NAME=${1:-"default"}
IMAGE_NAME="python-runner"
WORKSPACE_DIR="$(pwd)/workspace"

if [ "$PROJECT_NAME" != "default" ]; then
  WORKSPACE_DIR="$(pwd)/projects/$PROJECT_NAME"
fi

echo "Building Docker image..."
docker build -t $IMAGE_NAME ./python-runner

echo "Starting Streamlit Container..."
echo "Access the app at http://localhost:8501"

docker run --rm --network host -v "$WORKSPACE_DIR:/workspace" $IMAGE_NAME /bin/sh /workspace/run_streamlit.sh
