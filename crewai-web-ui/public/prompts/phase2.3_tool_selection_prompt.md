
* **Instruction:** Only use the previouly json as a source of truth.
* **Objective:** Your task is to select the appropriate tools for each task from the 'Canonical Tool Library'. If no suitable tool is available, you must identify that a custom tool is required.

To ensure a realistic and grounded design, all tool selections must be made **exclusively** from the following canonical list of available tools. The `tool_selection_justification` field within the `tool_repository` must reference this list for its evaluation.


```json
{
"canonical_tool_library": {
      "description": "A central list defining the complete set of approved tool configurations for this crew. This list is **pre-defined** and must be populated exactly as specified.",
      "tools_list": [
        {
          "tool_name": "CodeDocsSearchTool",
          "tool_id": "code_docs_searcher",
          "supports_embedding": true,
          "description": "A tool for searching code documentation."
        },
        {
          "tool_name": "PDFSearchTool",
          "tool_id": "pdf_searcher",
          "supports_embedding": true,
          "description": "A tool for searching PDF documents."
        },
        {
          "tool_name": "FileReadTool",
          "tool_id": "file_reader",
          "supports_embedding": false,
          "description": "A tool for reading files."
        },
        {
          "tool_name": "FileWriterTool",
          "tool_id": "file_writer",
          "supports_embedding": false,
          "description": "A tool for writing files."
        },
        {
          "tool_name": "DirectoryReadTool",
          "tool_id": "directory_reader",
          "supports_embedding": false,
          "description": "A tool for reading directory contents."
        },
        {
          "tool_name": "CSVSearchTool",
          "tool_id": "csv_searcher",
          "supports_embedding": true,
          "description": "A tool for searching CSV files."
        },
        {
          "tool_name": "DOCXSearchTool",
          "tool_id": "docx_searcher",
          "supports_embedding": true,
          "description": "A tool for searching DOCX files."
        },
        {
          "tool_name": "MDXSearchTool",
          "tool_id": "mdx_searcher",
          "supports_embedding": true,
          "description": "A tool for searching MDX files."
        },
        {
          "tool_name": "RagTool",
          "tool_id": "rag_tool",
          "supports_embedding": true,
          "description": "A general-purpose RAG tool."
        },
        {
          "tool_name": "TXTSearchTool",
          "tool_id": "txt_searcher",
          "supports_embedding": true,
          "description": "A tool for searching TXT files."
        },
        {
          "tool_name": "XMLSearchTool",
          "tool_id": "xml_searcher",
          "supports_embedding": true,
          "description": "A tool for searching XML files."
        },
        {
          "tool_name": "mcp-search-crawl",
          "tool_id": "mcp-search-crawl",
          "supports_embedding": false,
          "description": "A combined tool that allows both searching the web and crawling/scraping content from URLs. It provides 'perform_web_search' for finding information and 'crawl_single_url'/'crawl_webpage' for extracting content.",
          "serverparams": {
            "command": "python",
            "args": ["/workspace/mcp/mcp_search_crawl.py"]
          }
        },
        {
          "tool_name": "time-stdio",
          "tool_id": "mcp_time_adapter",
          "supports_embedding": false,
          "description": "It should be used whenever there is a time component to the task allowing to now the current date and time. Must be used for all cases that are a time component in the task, for instance reference to 'current', days, hours, past, future dates, or all other kind of temporal references.",
          "serverparams": {
            "command": "uvx",
            "args": ["mcp-server-time"]
          }
        },
        {
          "tool_name": "excel-stdio",
          "tool_id": "mcp_excel_adapter",
          "supports_embedding": false,
          "description": "This MCP server is designed to handle Excel files, allowing for reading and writing operations directly from standard input/output. It supports various Excel file formats and can be used to manipulate spreadsheet data programmatically.",
          "serverparams": {
            "command": "uvx",
            "args": ["excel-mcp-server", "stdio"]
          }
        },
        {
          "tool_name": "mcp-pandoc",
          "tool_id": "mcp_pandoc_adapter",
          "supports_embedding": false,
          "description": "Converts a document from one format to another using Pandoc by taking a source `input_path` and a destination `output_path`, returning a string message indicating the result. The desired output format is automatically inferred from the output file's extension. Supported input formats include biblatex, bibtex, commonmark, creole, csljson, csv, docbook, docx, dokuwiki, endnotexml, epub, fb2, gfm, haddock, html, ipynb, jats, jira, json, latex, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, man, muse, native, odt, opml, org, ris, rst, rtf, t2t, textile, tikiwiki, tsv, twiki, and vimwiki. Supported output formats include asciidoc, beamer, commonmark, context, csljson, docbook, docx, dokuwiki, dzslides, epub, fb2, gfm, haddock, html, icml, ipynb, jats, jira, json, latex, man, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, ms, muse, native, odt, opml, opendocument, org, pdf, plain, pptx, revealjs, rst, rtf, s5, slidy, slideous, tei, texinfo, textile, xwiki, and zimwiki.",
          "serverparams": {
            "command": "python",
            "args": ["/workspace/mcp/mcp_pandadoc_converter.py"]
          }
        }
      ]
    }
}
```

JSON Schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "tool_repository": {
      "type": "array",
      "description": "Each object represents a task from task_roster to identify and select tools required for the task.",
      "items": {
        "type": "object",
        "properties": {
          "task_identifier": {
            "type": "string",
            "description": "From the detailed plan."
          },
          "justification": {
            "type": "string",
            "description": "Considering the information of the current task available in the design_metadata and yaml_definition, you should determine if a tool is required or not, and why based on the capabilities of a llm. Be aware that the llm are not time-aware, so if the task has any time component, you should select the time-stdio tool."
          },
          "tools": {
            "type": "array",
            "description": "Defines instances of tools selected exclusively from the provided 'canonical_tool_library'.",
            "items": {
              "type": "object",
              "properties": {
                "design_metadata": {
                  "type": "object",
                  "properties": {
                    "tool_id": {
                      "type": "string",
                      "description": "A unique identifier for this specific tool instance."
                    },
                    "required_functionality": {
                      "type": "string",
                      "description": "A clear, one-sentence description of the specific action the tool must perform."
                    },
                    "task_use_case": {
                      "type": "string",
                      "description": "Including a use case of how this tool can be used to accomplish the task including example of the input and expected of this tool."
                    },
                    "crewai_tool_evaluation": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "tool_selection_justification": {
                            "type": "string",
                            "description": "Justify the choice of tool from the 'canonical_tool_library' list."
                          },
                          "is_valid_availiable_tool": {
                            "type": "boolean",
                            "description": "`True` or `False`."
                          },
                          "tool_name": {
                            "type": "string",
                            "description": "The exact, importable CrewAI tool class."
                          }
                        },
                        "required": ["tool_selection_justification", "is_valid_availiable_tool", "tool_name"]
                      }
                    }
                  },
                  "required": ["tool_id", "required_functionality", "task_use_case", "crewai_tool_evaluation"]
                },
                "custom_tool": {
                  "type": "object",
                  "description": "Contains only the parameters for the tool's class constructor only if there is no tool available to perform the requirements and a custom crewai tool should be developed",
                  "properties": {
                    "is_custom_tool": {
                      "type": "boolean",
                      "description": "`True` if no available tool is sufficient."
                    },
                    "class_name": {
                      "type": "string",
                      "description": "The exact Python class name to the custom tool that will developed"
                    },
                  }
                }
                "canonical_tool": {
                  "type": "object",
                  "description": "Contains only the parameters for the tool's class constructor only if `is_custom_tool` is `False`. CRITICAL RULE for MCP Servers: If using an MCP Server, the `class_name` MUST be `MCPServerAdapter`. The `initialization_params` object MUST contain a single key: `serverparams`. This `serverparams` object must contain two keys: `command` (String) and `args` (Array of Strings), which define how to run the MCP server process.",
                  "properties": {
                    "class_name": {
                      "type": "string",
                      "description": "The exact Python class name to instantiate."
                    },
                    "initialization_params": {
                      "type": "object",
                      "description": "Constructor parameters for the tool."
                    }
                  },
                  "required": ["class_name"]
                }
              },
              "required": ["design_metadata"]
            }
          }
        },
        "required": ["task_identifier", "justification"]
      }
    }
  },
  "required": ["tool_repository"]
}
```

Your entire response must be a single, valid JSON object derived from the json schema below without include the schema itself. Do not include any other text before or after the JSON.