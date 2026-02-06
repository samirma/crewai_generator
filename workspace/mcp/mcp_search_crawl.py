import asyncio
import os
import json
import httpx
import configparser
from mcp.server.fastmcp import FastMCP

# Initialize the FastMCP server
mcp = FastMCP("Search and Crawl Server")

# --- Configuration & Helpers ---

def get_config_value(section: str, key: str, default=None):
    """
    Helper to safely read from server_config.ini
    """
    config_path = os.path.join(os.path.dirname(__file__), 'server_config.ini')
    try:
        if os.path.exists(config_path):
            config = configparser.ConfigParser()
            config.read(config_path)
            if section in config and key in config[section]:
                return config[section][key].strip()
    except Exception as e:
        print(f"Error reading server config file: {e}")
    return default

def get_base_url(service_port_key: str, default_port: int, env_var: str = None) -> str | None:
    """
    Resolves the base URL for a service based on config or defaults.
    """
    ip = get_config_value('DEFAULT', 'server_ip')
    
    if ip:
        port = get_config_value('DEFAULT', service_port_key, str(default_port))
        try:
            port = int(port)
        except ValueError:
            port = default_port
        url = f"http://{ip}:{port}"
    else:
        # Fallback for Crawl4AI if no IP in config, mostly for local dev if needed
        # SearxNG usually requires strict config, but we return None if strict
        if env_var:
             return os.getenv(env_var, f"http://localhost:{default_port}")
        return None

    if env_var:
        return os.getenv(env_var, url)
    return url

# Initialize URLs
SEARXNG_URL = get_base_url('searxng_port', 8080)
CRAWL4AI_URL = get_base_url('crawl4ai_port', 11235, 'CRAWL4AI_API_URL')

async def make_request(url: str, method: str = "GET", params: dict = None, json_data: dict = None, timeout: float = 60.0) -> dict | str:
    """
    Unified async HTTP request handler using httpx.
    """
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if method.upper() == "GET":
                response = await client.get(url, params=params)
            else:
                response = await client.post(url, json=json_data)
            
            response.raise_for_status()
            return response.json()
            
    except httpx.RequestError as e:
        return f"Network error connecting to {url}: {e}"
    except httpx.HTTPStatusError as e:
        return f"HTTP error {e.response.status_code}: {e.response.text}"
    except json.JSONDecodeError:
        return f"Error: Failed to decode JSON response from {url}"
    except Exception as e:
        return f"An unexpected error occurred: {e}"

# --- SearxNG (Search) Logic ---

@mcp.tool()
async def perform_web_search(query: str, pageno: int = 1) -> str:
    """
    Performs a web search to find relevant URLs and content snippets.

    Use this tool FIRST when the user asks about:
    - Current events, news, or recent information
    - Facts or data that may have changed over time
    - Topics you don't have detailed knowledge about
    - Finding specific websites or documentation

    After finding relevant URLs, use crawl_webpage or crawl_single_url to extract
    full content if needed.

    Args:
        query: The search keywords or question.
        pageno: Page number of results (1-based, default: 1).

    Returns:
        JSON string with search results. Each result contains 'url' and 'content'.
        Returns an error message if the search service is unavailable.
    """
    if not SEARXNG_URL:
        return "Error: SearxNG service address is not available. Please check server_config.ini."

    print(f"Using SearxNG instance at: {SEARXNG_URL}")
    endpoint = f"{SEARXNG_URL}/search" if not SEARXNG_URL.endswith('/') else f"{SEARXNG_URL}search"
    params = {'q': query, 'format': 'json', 'pageno': pageno}
    
    result = await make_request(endpoint, method="GET", params=params)
    
    if isinstance(result, str): # Error message
        return result
        
    formatted_results = []
    if "results" in result:
        for item in result["results"]:
            formatted_results.append({
                "url": item.get("url"),
                "content": item.get("content")
            })
    
    if not formatted_results:
        return f"No results found for '{query}' on page {pageno}."
        
    return json.dumps(formatted_results)

# --- Crawl4AI (Crawl) Logic ---

async def _perform_crawl(
    urls: list[str], 
    js_code: str = None, 
    wait_for: str = None, 
    css_selector: str = None,
    include_raw_html: bool = False,
    bypass_cache: bool = True
) -> str:
    """
    Internal helper to execute the crawl request against the API.
    """
    endpoint = f"{CRAWL4AI_URL}/crawl"
    
    payload = {
        "urls": urls,
        "include_raw_html": include_raw_html,
        "bypass_cache": bypass_cache,
    }

    if js_code:
        payload["js_code"] = [js_code]
    if wait_for:
        payload["wait_for"] = wait_for
    if css_selector:
        payload["css_selector"] = css_selector

    data = await make_request(endpoint, method="POST", json_data=payload)
    
    if isinstance(data, str): # Error message
        return data

    # Handle response containing multiple results
    if "results" in data and isinstance(data["results"], list):
        results_text = []
        for result in data["results"]:
            # Check if 'markdown' is a dictionary or string
            markdown_data = result.get("markdown")
            if isinstance(markdown_data, dict) and "raw_markdown" in markdown_data:
                content = markdown_data["raw_markdown"]
            else:
                content = markdown_data or result.get("html", "No content found.")
            
            entry = f"{content}\n"
            results_text.append(entry)
        
        if not results_text:
            return "No results returned."
        
        return "\n---\n".join(results_text)
        
    elif "markdown" in data:
        # Handle single result fallback
        md = data["markdown"]
        if isinstance(md, dict) and "raw_markdown" in md:
            return md["raw_markdown"]
        return md
    elif "html" in data:
        return f"Markdown not returned, raw length: {len(data['html'])} chars. Status: {data.get('status')}"
    else:
        return f"Crawl successful but unexpected response format. Keys received: {list(data.keys())}"

@mcp.tool()
async def crawl_webpage(urls: list[str]) -> str:
    """
    Extracts the main content from multiple webpages and returns it as markdown.

    Use this tool when you need to read the full content of one or more webpages
    identified from a search, or when the user provides specific URLs to analyze.

    For a single URL, consider using crawl_single_url for simplicity.

    Args:
        urls: List of webpage URLs to crawl. Limit to 5-10 URLs per call for best results.

    Returns:
        Markdown content from all URLs, separated by '---' dividers.
        Returns an error message if a URL is inaccessible or the crawl fails.
    """
    return await _perform_crawl(urls)

@mcp.tool()
async def crawl_single_url(url: str) -> str:
    """
    Extracts the main content from a single webpage and returns it as markdown.

    Use this tool when you need to read content from one specific URL.
    This is a convenience wrapper around crawl_webpage for single URLs.

    Args:
        url: The webpage URL to crawl.

    Returns:
        Markdown content of the webpage.
        Returns an error message if the URL is inaccessible or the crawl fails.
    """
    return await _perform_crawl([url])

if __name__ == "__main__":
    print("--- Initializing Search and Crawl Server (Refactored) ---")
    
    if SEARXNG_URL:
        print(f"✅ SearxNG configured at: {SEARXNG_URL}")
    else:
        print("⚠️  SearxNG IP not found in server_config.ini (Search will fail)")

    print(f"✅ Crawl4AI configured at: {CRAWL4AI_URL}")
    
    print("The server is now ready to accept tool calls.")
    mcp.run(transport='stdio')
