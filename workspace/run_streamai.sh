#!/bin/sh
set -e

if [ -f /workspace/pre_docker_run.sh ]; then
  echo "--- Running pre_docker_run.sh ---";
  /bin/sh /workspace/pre_docker_run.sh;
  echo "--- pre_docker_run.sh finished with exit code 0 ---";
else
  echo "--- /workspace/pre_docker_run.sh not found, skipping. ---";
fi

echo "--- Running main script ---"
cd /workspace/crewai_generated && \
cp /workspace/.env /workspace/crewai_generated/ && \
touch /workspace/crewai_generated/src/crewai_generated/__init__.py

if uv run run_streamai; then
  echo "StreamAI Execution successful"
else
  echo "StreamAI Execution failed"
  exit 1
fi
echo "--- Main script finished with exit code 0 ---"
