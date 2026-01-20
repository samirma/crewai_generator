#!/bin/sh
# This script starts the docker container and runs run_streamai.sh inside it
# It assumes the image 'python-runner' is already built.

IMAGE_NAME="python-runner"
WORKSPACE_DIR="$(pwd)/workspace"

echo "Using workspace: $WORKSPACE_DIR"

# Run the docker container
# We use --network host to allow easy access to the streamlit port (usually 8501)
docker run --rm --network host \
  -v "$WORKSPACE_DIR:/workspace" \
  "$IMAGE_NAME" \
  /bin/sh -c "/bin/sh /workspace/run_streamai.sh"
