import asyncio
import os
import httpx
import socket
import time
import configparser
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("Crawl4AI")

def get_server_ip_from_config() -> str | None:
    """
    Reads the server IP from the server_config.ini file using configparser.
    """
    config_path = os.path.join(os.path.dirname(__file__), 'server_config.ini')
    try:
        if os.path.exists(config_path):
            config = configparser.ConfigParser()
            config.read(config_path)
            if 'DEFAULT' in config and 'server_ip' in config['DEFAULT']:
                return config['DEFAULT']['server_ip'].strip()
    except Exception as e:
        print(f"Error reading server config file: {e}")
    return None

# Configuration
# 1. Try to find the host IP via config file
discovered_ip = get_server_ip_from_config()

# 2. Determine the Base URL
if discovered_ip:
    # discovered_ip is just the IP now, e.g. "192.168.1.5"
    default_url = f"http://{discovered_ip}:11235"
    print(f"Discovered Host IP from config: {discovered_ip}. Using Crawl4AI at: {default_url}")
else:
    # Fallback to localhost or env var
    default_url = "http://localhost:11235"
    print(f"Server IP config not found or empty. Defaulting to: {default_url}")

CRAWL4AI_API_URL = os.getenv("CRAWL4AI_API_URL", default_url)

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
    endpoint = f"{CRAWL4AI_API_URL}/crawl"
    
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

    try:
        # Increased timeout to 60s because crawling multiple URLs can take longer
        async with httpx.AsyncClient(timeout=60.0) as client: 
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            # Handle response containing multiple results
            if "results" in data and isinstance(data["results"], list):
                results_text = []
                for result in data["results"]:
                    url = result.get("url", "Unknown URL")
                    
                    # Check if 'markdown' is a dictionary (e.g. containing citations, raw_markdown, etc.)
                    # and extract just the raw_markdown if so.
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
                # Handle single result fallback if structure is flat (older API versions)
                md = data["markdown"]
                if isinstance(md, dict) and "raw_markdown" in md:
                    return md["raw_markdown"]
                return md
            elif "html" in data:
                return f"Markdown not returned, raw length: {len(data['html'])} chars. Status: {data.get('status')}"
            else:
                return f"Crawl successful but unexpected response format. Keys received: {list(data.keys())}"

    except httpx.RequestError as e:
        return f"Error: Could not connect to Crawl4AI at {CRAWL4AI_API_URL}. Is the Docker container running? Details: {str(e)}"
    except httpx.HTTPStatusError as e:
        return f"Error: Crawl4AI returned error status {e.response.status_code}. Details: {e.response.text}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"

#@mcp.tool()
async def crawl_webpage(
    urls: list[str]
) -> str:
    """
    Reads and extracts the main content in markdown format from a LIST of URLs.
    
    Use this tool when you need to crawl multiple pages in parallel.

    Args:
        urls: A list of full URLs to crawl (e.g., ["https://example.com", "https://another.com"]).
    """
    return await _perform_crawl(urls)

@mcp.tool()
async def crawl_single_url(
    url: str
) -> str:
    """
    Reads and extracts the main content in markdown format  from a SINGLE URL.
    
    Use this tool when you only have one page to read.
    
    Args:
        url: The single full URL to crawl (e.g., "https://example.com").
    """
    # Wrap the single URL in a list and call the shared logic
    return await _perform_crawl([url])

if __name__ == "__main__":
    mcp.run()