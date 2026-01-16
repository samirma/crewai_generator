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
rm -rf /workspace/crewai_generated/execution_log.json
if uv run run_crew; then
  echo "Crew Execution successful"
else
  echo "Crew Execution failed"
  exit 1
fi
echo "--- Main script finished with exit code 0 ---"
