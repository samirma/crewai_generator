#!/bin/bash

# Test script to call the local Ollama API directly
# Ollama API endpoint: http://localhost:11434/v1/chat/completions
#
# Usage: ./test_ollama_direct.sh <payload_file.json>
# Example: ./test_ollama_direct.sh payload.json

# Check if payload file argument is provided
if [ $# -lt 1 ]; then
    echo "Error: Payload file not specified." >&2
    echo "Usage: $0 <payload_file.json>" >&2
    echo "Example: $0 payload.json" >&2
    exit 1
fi

PAYLOAD_FILE="$1"

# Check if the payload file exists
if [ ! -f "$PAYLOAD_FILE" ]; then
    echo "Error: Payload file not found: $PAYLOAD_FILE" >&2
    exit 1
fi

# Ollama local server endpoint
OLLAMA_URL="http://localhost:11434/v1/chat/completions"

# Use kimi-k2.5:cloud model
MODIFIED_PAYLOAD=$(jq '.model = "kimi-k2.5:cloud"' "$PAYLOAD_FILE")

# Send request to local Ollama server
curl -X POST "${OLLAMA_URL}" \
  -H "Content-Type: application/json" \
  -d "$MODIFIED_PAYLOAD"
