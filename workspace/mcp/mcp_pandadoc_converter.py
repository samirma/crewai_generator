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
    Converts a document from one format to another using Pandoc by taking a source `input_path` and a destination `output_path`, returning a string message indicating the result. The desired output format is automatically inferred from the output file's extension. Supported input formats include biblatex, bibtex, commonmark, creole, csljson, csv, docbook, docx, dokuwiki, endnotexml, epub, fb2, gfm, haddock, html, ipynb, jats, jira, json, latex, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, man, muse, native, odt, opml, org, ris, rst, rtf, t2t, textile, tikiwiki, tsv, twiki, and vimwiki. Supported output formats include asciidoc, beamer, commonmark, context, csljson, docbook, docx, dokuwiki, dzslides, epub, fb2, gfm, haddock, html, icml, ipynb, jats, jira, json, latex, man, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, ms, muse, native, odt, opml, opendocument, org, pdf, plain, pptx, revealjs, rst, rtf, s5, slidy, slideous, tei, texinfo, textile, xwiki, and zimwiki.

    You must generate a tool call to the `convert_document` function. Your call must include two string arguments: `input_path`, representing the local path to the source file that needs to be converted, and `output_path`, representing the local path where the converted file should be saved. The file extension provided in the `output_path` (e.g., `.docx`, `.pdf`, `.html`) dictates the output format, so ensure it matches one of the supported output types. For example, to convert a Markdown file to a PDF, your tool call would be: `tool_call('convert_document', input_path='report.md', output_path='report.pdf')`.
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