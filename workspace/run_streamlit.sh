#!/bin/sh
set -e

if [ -f /workspace/pre_docker_run.sh ]; then
  echo "--- Running pre_docker_run.sh ---";
  /bin/sh /workspace/pre_docker_run.sh;
  echo "--- pre_docker_run.sh finished with exit code 0 ---";
else
  echo "--- /workspace/pre_docker_run.sh not found, skipping. ---";
fi

echo "--- Running Streamlit app ---"
cd /workspace/crewai_generated && \
cp /workspace/.env /workspace/crewai_generated/ && \
touch /workspace/crewai_generated/src/crewai_generated/__init__.py
rm -rf /workspace/crewai_generated/execution_log.json

# Using uv run to execute the entry point defined in pyproject.toml
if uv run run_streamlit; then
  echo "Streamlit App stopped"
else
  echo "Streamlit App stopped with error"
  exit 1
fi
echo "--- Streamlit script finished with exit code 0 ---"
