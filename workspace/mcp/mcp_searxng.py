import requests
import json
import time
import socket
import sys
from fastmcp import FastMCP
from zeroconf import ServiceBrowser, Zeroconf, ServiceListener

# This global variable will hold the address of the discovered service.
searxng_service_address = None

class ServiceDiscoveryListener(ServiceListener):
    """
    A listener for Zeroconf that captures details of the first service found.
    """
    def __init__(self):
        self.discovered_services = []

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        """Called by Zeroconf when a new service is discovered."""
        info = zc.get_service_info(type_, name)
        if not info:
            return

        # Build the full base URL for the service
        address = socket.inet_ntoa(info.addresses[0])
        port = info.port
        full_address = f"http://{address}:{port}/"
        
        # Store the service details
        service_data = {
            "name": info.name,
            "address": full_address,
        }
        self.discovered_services.append(service_data)
        print(f"-> Found service: {info.name} at {full_address}")

    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        """Called when a service is updated; not needed for this implementation."""
        pass

    def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        """Called when a service is removed; not needed for this implementation."""
        pass

def find_searxng_service_at_startup(timeout: int = 5) -> str | None:
    """
    Scans the network for a SearxNG service using Zeroconf.

    Args:
        timeout: The number of seconds to search for the service.

    Returns:
        The full base URL of the first discovered service, or None if no
        service was found within the timeout period.
    """
    SERVICE_TYPE = "_searxng._tcp.local."
    
    zeroconf = Zeroconf()
    listener = ServiceDiscoveryListener()
    browser = ServiceBrowser(zeroconf, SERVICE_TYPE, listener)
    
    print(f"🔍 Searching for '{SERVICE_TYPE}' services for {timeout} seconds...")
    
    try:
        # Wait for the specified time to allow for discovery
        time.sleep(timeout)
    finally:
        zeroconf.close()

    # If services were found, return the address of the first one
    if listener.discovered_services:
        return listener.discovered_services[0]["address"]
    
    # Otherwise, return None
    return None

# Initialize the FastMCP server
mcp = FastMCP("SearxNG Web Search Server")

@mcp.tool
def perform_web_search(query: str, pageno: int = 1) -> str:
    """
    Performs a web search using the pre-discovered local SearxNG instance.
    """
    if not searxng_service_address:
        return "Error: SearxNG service address is not available. The server may have failed to find the service at startup."

    try:
        print(f"Using SearxNG instance at: {searxng_service_address}")
        params = {'q': query, 'format': 'json', 'pageno': pageno}
        # The base URL already has a trailing slash from the discovery function
        response = requests.get(f"{searxng_service_address}search", params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Format the results for clarity
        formatted_results = []
        if "results" in data:
            for result in data["results"]:
                formatted_results.append({
                    "url": result.get("url"),
                    "title": result.get("title"),
                    "content": result.get("content")
                })
        
        if not formatted_results:
            return f"No results found for '{query}' on page {pageno}."
            
        return json.dumps(formatted_results, indent=2)

    except requests.exceptions.RequestException as e:
        return f"A network error occurred: {e}. The SearxNG server may be offline. Please restart this tool server."
    except json.JSONDecodeError:
        return "Error: Failed to decode JSON from the response."
    except Exception as e:
        return f"An unexpected error occurred: {e}"

if __name__ == "__main__":
    print("--- Initializing Tool Server ---")
    
    # 1. Discover the SearxNG service before starting the server.
    found_address = find_searxng_service_at_startup()
    
    # 2. Check if the discovery was successful.
    if found_address:
        # 3. If found, set the global variable and run the MCP server.
        searxng_service_address = found_address
        print(f"\n✅ Service found. Configuring server to use: {searxng_service_address}")
        print("The server is now ready to accept tool calls.")
        mcp.run()
    else:
        # 4. If not found, print an error and exit.
        print("\n❌ Fatal Error: SearxNG service not found on the network.")
        print("The tool server will not start. Please ensure the SearxNG service is running and discoverable.")
        sys.exit(1)