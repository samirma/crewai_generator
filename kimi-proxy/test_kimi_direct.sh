#!/bin/bash

# Test script to call the Kimi API directly (without the local wrapper)
# Kimi API endpoint: https://api.kimi.com/coding/v1/messages

# Load KIMI_API_KEY from .env file (same location as used by kimi_server.js)
ENV_FILE="$(dirname "$0")/../workspace/.env"

if [ -f "$ENV_FILE" ]; then
    # Extract KIMI_API_KEY from .env file
    API_KEY=$(grep "^KIMI_API_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
else
    echo "Error: .env file not found at $ENV_FILE" >&2
    exit 1
fi

if [ -z "$API_KEY" ]; then
    echo "Error: KIMI_API_KEY not found in .env file" >&2
    exit 1
fi

curl -X POST https://api.kimi.com/coding/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "kimi-k2.5",
    "max_tokens": 131072,
    "stream": false,
    "thinking": {
      "type": "enabled"
    },
    "messages": [
      {
        "role": "user",
        "content": "Write a small Python function that calculates the factorial of a number using recursion"
      }
    ]
  }' | jq .
