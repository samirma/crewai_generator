# server.py
import os
import pypandoc
from fastmcp import FastMCP

# Initialize the FastMCP server with a descriptive name.
# This server will run locally and use the default STDIO transport.
mcp = FastMCP("Pandoc Document Conversion Server")

@mcp.tool
def convert_document(input_path: str, output_path: str) -> str:
    """
    Converts a document from one format to another using Pandoc.

    Use this tool when the user needs to convert files between formats like:
    - Markdown to PDF, DOCX, or HTML
    - HTML to Markdown or PDF
    - DOCX to Markdown or PDF
    - Any other document format conversion

    Args:
        input_path: Path to the source file to convert.
        output_path: Path where the converted file will be saved. The file extension
            determines the output format (e.g., .pdf, .docx, .html, .md).

    Returns:
        A message indicating success or describing any error that occurred.
    """
    try:
        # Extract the output format from the output file's extension.
        output_format = os.path.splitext(output_path)[1][1:]

        if not output_format:
            return "Error: Could not determine the output format from the output_path. Please include a file extension (e.g., '.pdf', '.docx')."

        # Use pypandoc to convert the file.
        pypandoc.convert_file(input_path, output_format, outputfile=output_path)

        return f"Successfully converted '{input_path}' to '{output_path}'."

    except FileNotFoundError:
        return f"Error: The input file '{input_path}' was not found."
    except Exception as e:
        return f"An error occurred during conversion: {e}"

if __name__ == "__main__":
    # This block ensures the server runs only when the script is executed directly.
    # By default, mcp.run() uses the STDIO transport, which is ideal for local tools.
    print("Starting the Pandoc conversion server...")
    print("The server is now ready to accept tool calls.")
    mcp.run()