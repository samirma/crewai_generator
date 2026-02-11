#!/bin/bash

# Test script to call the Kimi API directly (without the local wrapper)
# Kimi API endpoint: https://api.kimi.com/coding/v1/messages

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

# Extract KIMI_API_KEY from .env file
API_KEY=$(grep "^KIMI_API_KEY=" "$ENV_FILE_PATH" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

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
      "type": "disabled"
    },
    "messages": [
      {
        "role": "user",
        "content": "Assess the quality of the task completed based on the description, expected output, and actual results.\n\nTask Description:\nExecute parallel async queries to multiple news sources including NewsAPI, CryptoPanic, RSS feeds from CoinDesk and CoinTelegraph, and financial aggregators using keywords: '\''Bitcoin'\'', '\''BTC'\'', '\''price'\'', '\''regulation'\'', '\''ETF'\'', '\''macro'\''. Filter results to only include articles published within the last 48 hours. For each article, collect comprehensive metadata: URL, title, source name, publication timestamp, and content snippet. Handle API rate limits and connection failures gracefully. Return a structured list of raw news articles with complete metadata from diverse authoritative sources.\n\nExpected Output:\nA structured list of raw news articles discovered within the specified 48 hour window, each containing at minimum: title, URL, source name, publication timestamp, and content snippet. The list should include articles from diverse authoritative financial and cryptocurrency news sources.\n\nActual Output:\nI need to execute parallel async queries to gather Bitcoin news from the last 48 hours using diverse keyword combinations. Let me start by performing multiple web searches simultaneously to capture comprehensive coverage from different sources and angles.\n\nAction: perform_web_search\nAction Input: {\"query\": \"Bitcoin BTC price crash February 2026 news\", \"pageno\": 1}\n\nThought: I need to continue with additional searches to gather comprehensive coverage from different angles - regulation, ETF, and macro themes.\n\nAction: perform_web_search\nAction Input: {\"query\": \"Bitcoin ETF SEC regulation February 2026\", \"pageno\": 1}\n\nThought: I need to search for macroeconomic and Fed-related Bitcoin news to complete my comprehensive coverage.\n\nAction: perform_web_search\nAction Input: {\"query\": \"Bitcoin Fed interest rates macro February 2026\", \"pageno\": 1}\n\nThought: I need to search for additional Bitcoin news from crypto-specific sources like CoinDesk and CoinTelegraph to ensure comprehensive coverage.\n\nAction: perform_web_search\nAction Input: {\"query\": \"CoinDesk Bitcoin news February 2026\", \"pageno\": 1}\n\nThought: I need to search for CoinTelegraph Bitcoin news to complete my coverage.\n\nAction: perform_web_search\nAction Input: {\"query\": \"CoinTelegraph Bitcoin BTC news February 2026\", \"pageno\": 1}"
      }
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "schema": {
          "$defs": {
            "Entity": {
              "properties": {
                "name": {
                  "description": "The name of the entity.",
                  "title": "Name",
                  "type": "string"
                },
                "type": {
                  "description": "The type of the entity.",
                  "title": "Type",
                  "type": "string"
                },
                "description": {
                  "description": "Description of the entity.",
                  "title": "Description",
                  "type": "string"
                },
                "relationships": {
                  "description": "Relationships of the entity.",
                  "items": {
                    "type": "string"
                  },
                  "title": "Relationships",
                  "type": "array"
                }
              },
              "required": [
                "name",
                "type",
                "description",
                "relationships"
              ],
              "title": "Entity",
              "type": "object",
              "additionalProperties": false
            }
          },
          "properties": {
            "suggestions": {
              "description": "Suggestions to improve future similar tasks.",
              "items": {
                "type": "string"
              },
              "title": "Suggestions",
              "type": "array"
            },
            "quality": {
              "description": "A score from 0 to 10 evaluating on completion, quality, and overall performance, all taking into account the task description, expected output, and the result of the task.",
              "title": "Quality",
              "type": "number"
            },
            "entities": {
              "description": "Entities extracted from the task output.",
              "items": {
                "$ref": "#/$defs/Entity"
              },
              "title": "Entities",
              "type": "array"
            }
          },
          "required": [
            "suggestions",
            "quality",
            "entities"
          ],
          "title": "TaskEvaluation",
          "type": "object",
          "additionalProperties": false
        },
        "name": "TaskEvaluation",
        "strict": true
      }
    }
  }' | jq .
