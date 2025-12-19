import requests
import json
import sys
import os
import configparser

from mcp.server.fastmcp import FastMCP

# Initialize the FastMCP server
mcp = FastMCP("SearxNG Web Search Server")

# Global variable to cache the address
_SEARXNG_URL = None

def get_searxng_url() -> str | None:
    """
    Retrieves the SearxNG service address, loading it from config if not already cached.
    """
    global _SEARXNG_URL
    if _SEARXNG_URL:
        return _SEARXNG_URL

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

    if ip:
        _SEARXNG_URL = f"http://{ip}:{port}"
        return _SEARXNG_URL
    
    return None

@mcp.tool()
def perform_web_search(query: str, pageno: int = 1) -> str:
    """
    Performs a web search to retrieve relevant URLs and content snippets.

    Use this tool when you need to find up-to-date public information, external documentation,
    or identify specific URLs for further processing.

    Args:
        query (str): The search keywords or question.
        pageno (int): The page number of results to retrieve (default: 1).

    Returns:
        str: A JSON formatted string containing a list of search results.
             Each item has:
             - 'url': The link to the source.
             - 'content': A brief text snippet (useful for checking relevance).
    """
    base_url = get_searxng_url()
    
    if not base_url:
        return "Error: SearxNG service address is not available. Please check server_config.ini."

    try:
        print(f"Using SearxNG instance at: {base_url}")
        params = {'q': query, 'format': 'json', 'pageno': pageno}
        
        if not base_url.endswith('/'):
            base_url += '/'
            
        response = requests.get(f"{base_url}search", params=params, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        
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
        return f"Network error connecting to SearxNG: {e}"
    except json.JSONDecodeError:
        return "Error: Failed to decode JSON response from SearxNG."
    except Exception as e:
        return f"An unexpected error occurred: {e}"

if __name__ == "__main__":
    print("--- Initializing Tool Server ---")
    url = get_searxng_url()
    if url:
        print(f"\n✅ Service address found: {url}")
        print("The server is now ready to accept tool calls.")
        # CHANGE: Explicitly specify transport as 'stdio' for local tool use
        mcp.run(transport='stdio')
    else:
        print("\n❌ Fatal Error: SearxNG server IP not found in server_config.ini.")
        sys.exit(1)