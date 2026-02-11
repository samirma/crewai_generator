#!/bin/bash

# Test script to call the Cerebras API directly
# Cerebras API endpoint: https://api.cerebras.ai/v1/chat/completions
#
# Usage: ./test_cerebras_direct.sh <payload_file.json>
# Example: ./test_cerebras_direct.sh payload_cerebras.json

# Check if payload file argument is provided
if [ $# -lt 1 ]; then
    echo "Error: Payload file not specified." >&2
    echo "Usage: $0 <payload_file.json>" >&2
    echo "Example: $0 payload_cerebras.json" >&2
    exit 1
fi

PAYLOAD_FILE="$1"

# Check if the payload file exists
if [ ! -f "$PAYLOAD_FILE" ]; then
    echo "Error: Payload file not found: $PAYLOAD_FILE" >&2
    exit 1
fi

# Load configuration
SCRIPT_DIR="$(dirname "$0")"
CONFIG_FILE="$SCRIPT_DIR/config.env"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found at $CONFIG_FILE" >&2
    exit 1
fi

# Source the config file to get ENV_FILE_PATH
source "$CONFIG_FILE"

if [ -z "$ENV_FILE_PATH" ]; then
    echo "Error: ENV_FILE_PATH not set in config.env" >&2
    exit 1
fi

if [ ! -f "$ENV_FILE_PATH" ]; then
    echo "Error: .env file not found at $ENV_FILE_PATH" >&2
    exit 1
fi

# Extract CEREBRAS_API_KEY from .env file
API_KEY=$(grep "^CEREBRAS_API_KEY=" "$ENV_FILE_PATH" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$API_KEY" ]; then
    echo "Error: CEREBRAS_API_KEY not found in .env file" >&2
    exit 1
fi

# Override the model to qwen-3-32b
MODIFIED_PAYLOAD=$(jq '.model = "qwen-3-32b"' "$PAYLOAD_FILE")

curl -X POST https://api.cerebras.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "$MODIFIED_PAYLOAD" | jq .
