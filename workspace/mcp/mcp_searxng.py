import requests
import json
import time
import sys
import os
import configparser
from fastmcp import FastMCP

# This global variable will hold the address of the discovered service.
searxng_service_address = None

def get_server_config() -> tuple[str | None, int]:
    """
    Reads the server IP and port from the server_config.ini file using configparser.
    Returns (ip, port). Port defaults to 8080 if not found.
    """
    config_path = os.path.join(os.path.dirname(__file__), 'server_config.ini')
    ip = None
    port = 8080
    try:
        if os.path.exists(config_path):
            config = configparser.ConfigParser()
            config.read(config_path)
            if 'DEFAULT' in config:
                if 'server_ip' in config['DEFAULT']:
                    ip = config['DEFAULT']['server_ip'].strip()
                if 'searxng_port' in config['DEFAULT']:
                    try:
                        port = int(config['DEFAULT']['searxng_port'].strip())
                    except ValueError:
                        pass
    except Exception as e:
        print(f"Error reading server config file: {e}")
    return ip, port

# Initialize the FastMCP server
mcp = FastMCP("SearxNG Web Search Server")

@mcp.tool
def perform_web_search(query: str, pageno: int = 1) -> str:
    """
    Performs a web search using the pre-discovered local SearxNG instance.

    Args:
        query (str): The search query string.
        pageno (int, optional): The page number of the search results to retrieve.
                                 Defaults to 1.

    Returns:
        str: A JSON formatted string containing the search results. Each result
             in the JSON array will have 'url', and 'content' keys.
             Note that the 'content' field provides a snippet of the URL's
             content, not the full page content. This snippet can be used to
             decide if a further, more in-depth scrape of the URL is required.
             Returns an error message string if:
             - The SearxNG service address is not available (e.g., discovery failed).
             - A network error occurs during the request to SearxNG.
             - The JSON response from SearxNG cannot be decoded.
             - No results are found for the given query and page number.

    Example of a successful output (JSON string):
    ```json
    [
      {
        "url": "[https://example.com/page1](https://example.com/page1)",
        "content": "This is an example of content for page 1."
      },
      {
        "url": "[https://example.com/page2](https://example.com/page2)",
        "content": "This is an example of content for page 2."
      }
    ]
    ```
    """
    if not searxng_service_address:
        return "Error: SearxNG service address is not available. The server may have failed to find the service at startup."

    try:
        print(f"Using SearxNG instance at: {searxng_service_address}")
        params = {'q': query, 'format': 'json', 'pageno': pageno}
        
        base_url = searxng_service_address
        if not base_url.endswith('/'):
            base_url += '/'
            
        response = requests.get(f"{base_url}search", params=params, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        
        # Format the results for clarity
        formatted_results = []
        if "results" in data:
            for result in data["results"]:
                formatted_results.append({
                    "url": result.get("url"),
                    "content": result.get("content")
                })
        
        if not formatted_results:
            return f"No results found for '{query}' on page {pageno}."
            
        return json.dumps(formatted_results)

    except requests.exceptions.RequestException as e:
        return f"A network error occurred: {e}. The SearxNG server may be offline. Please restart this tool server."
    except json.JSONDecodeError:
        return "Error: Failed to decode JSON from the response."
    except Exception as e:
        return f"An unexpected error occurred: {e}"

if __name__ == "__main__":
    print("--- Initializing Tool Server ---")
    
    # 1. Read the SearxNG service address from the config file.
    ip, port = get_server_config()
    
    # 2. Check if the address was found.
    if ip:
        # 3. If found, set the global variable and run the MCP server.
        searxng_service_address = f"http://{ip}:{port}"
        print(f"\n✅ Service address found in config. Configuring server to use: {searxng_service_address}")
        print("The server is now ready to accept tool calls.")
        mcp.run()
    else:
        # 4. If not found, print an error and exit.
        print("\n❌ Fatal Error: SearxNG server IP not found in server_config.ini.")
        print("Please ensure the web UI has discovered the service and saved the IP.")
        sys.exit(1)
