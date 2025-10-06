* **Instruction:** Use the 'Project Blueprint' and the 'Workflow, Memory, and LLMs JSON' as your sources of truth.
* **Objective:** Your task is to design the tool configuration for the CrewAI project. This involves selecting from a canonical list of existing tools, identifying the need for custom tools, and defining their structure.
* **Output Structure:** The design must clearly separate technical parameters (`constructor_args`) from contextual justification (`design_metadata`).
* **Final Output Format:** Your entire response must be a single JSON object with two keys: `tool_repository` and `custom_tool_definitions`. Do not include any other text before or after the JSON.

### **Canonical Tool Library for Evaluation**

To ensure a realistic and grounded design, all tool selections must be made **exclusively** from the following canonical list of available tools. The `tool_selection_justification` field within the `tool_repository` must reference this list for its evaluation.

#### `crewai_tools`

*   `ScrapeWebsiteTool` (supports_embedding: `False`)
*   `WebsiteSearchTool` (supports_embedding: `True`)
*   `BrowserbaseTool` (supports_embedding: `False`)
*   `CodeDocsSearchTool` (supports_embedding: `True`)
*   `PDFSearchTool` (supports_embedding: `True`)
*   `FileReadTool` (supports_embedding: `False`)
*   `FileWriterTool` (supports_embedding: `False`)
*   `DirectoryReadTool` (supports_embedding: `False`)
*   `CSVSearchTool` (supports_embedding: `True`)
*   `DOCXSearchTool` (supports_embedding: `True`)
*   `MDXSearchTool` (supports_embedding: `True`)
*   `RagTool` (supports_embedding: `True`)
*   `TXTSearchTool` (supports_embedding: `True`)
*   `XMLSearchTool` (supports_embedding: `True`)

#### MCP Servers

*   **`mcp-local-seaxng`**:
    *   `serverparams`: `{ "command": "python", "args": ["/workspace/mcp/mcp_searxng.py"] }`
    *   **Description**: This tool performs a web search based on a text query and an optional pageno for pagination. It returns a JSON formatted list of search results, with each result containing its url, title, and a only a snippet of the content. A scrape tool is required to get more information from each result.
*   **`time-stdio`**:
    *   `serverparams`: `{   "command": "uvx",  "args": ["mcp-server-time"]    }`
    *   **Description**: The Time MCP Server integrates with LLMs to provide accurate time information and timezone conversion capabilities. This server uses IANA timezone names and can automatically detect your system's timezone, allowing AI models to work with real-time temporal data.
*   **`excel-stdio`**:
    *   `serverparams`: `{ "command": "uvx", "args": ["excel-mcp-server", "stdio"] }`
    *   **Description**: This MCP server is designed to handle Excel files, allowing for reading and writing operations directly from standard input/output. It supports various Excel file formats and can be used to manipulate spreadsheet data programmatically.
*   **`mcp-pandoc`**:
    *   `serverparams`: `{ "command": "python", "args": ["/workspace/mcp/mcp_pandadoc_converter.py"] }`
    *   **Description**: Converts a document from one format to another using Pandoc by taking a source `input_path` and a destination `output_path`, returning a string message indicating the result. The desired output format is automatically inferred from the output file's extension. Supported input formats include biblatex, bibtex, commonmark, creole, csljson, csv, docbook, docx, dokuwiki, endnotexml, epub, fb2, gfm, haddock, html, ipynb, jats, jira, json, latex, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, man, muse, native, odt, opml, org, ris, rst, rtf, t2t, textile, tikiwiki, tsv, twiki, and vimwiki. Supported output formats include asciidoc, beamer, commonmark, context, csljson, docbook, docx, dokuwiki, dzslides, epub, fb2, gfm, haddock, html, icml, ipynb, jats, jira, json, latex, man, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, ms, muse, native, odt, opml, opendocument, org, pdf, plain, pptx, revealjs, rst, rtf, s5, slidy, slideous, tei, texinfo, textile, xwiki, and zimwiki.

---

**'Design-Crew-Architecture-Plan' - JSON Schema Section:**

*   `tool_repository` (Array of Objects): Each object defines a unique tool to be instantiated, separating design rationale from instantiation parameters.
    *   `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        *   `required_functionality` (String): A clear, one-sentence description of the specific action the tool must perform.
        *   `crewai_tool_evaluation` (Array of Objects): An evaluation of relevant crewai tools.
            *   `tool_selection_justification` (String): Review the **Canonical Tool Library** provided above (including both `crewai_tools` and `MCP Servers`) to identify the most suitable tool. Your analysis MUST explain why your chosen tool is optimal and why other relevant tools are not sufficient. Justify why a standard tool or an MCP server is the better choice for the task.
            *   `is_valid_availiable_tool` (Boolean): `True` or `False`.
            *   `tool_name` (String): The exact, importable CrewAI tool class. **Crucially, this name must match the latest library version.** For MCP Servers, this will be `MCPServerAdapter`.
        *   `is_custom_tool` (Boolean): `True` if no available tool is sufficient, derived from the analysis.
        *   `is_custom_embedding_supported` (Boolean): `True` if this selected tool supports embedding, e.g (PDFSearchTool, TXTSearchTool and RagTool, etc)
        *   `tool_llm_specification` (Object, Optional): **Required if `is_custom_embedding_supported` is `True` and `crew_memory.activation` is `True`.**
            *   `llm_id` (String): The identifier for the tool's internal LLM, chosen from the `llm_registry`.
            *   `rationale` (String): Justification for this LLM choice for the tool's internal processing (e.g., summarization).
    *   `constructor_args` (Object): Contains only the parameters for the tool's class constructor.
        *   `tool_id` (String): A unique identifier for this specific tool instance (e.g., "web_search_tool", "web_scout_adapter"). This acts as the primary identifier for the tool.
        *   `class_name` (String): The exact Python class name to instantiate. **This must be a verbatim, up-to-date class name from the `crewai_tools` library.**
        *   `initialization_params` (Object, Optional): Constructor parameters for the tool.
            **CRITICAL RULE for MCP Servers:** If using an MCP Server, the `class_name` MUST be `MCPServerAdapter`. The `initialization_params` object MUST contain a single key: `serverparams`. This `serverparams` object must contain two keys: `command` (String) and `args` (Array of Strings), which define how to run the MCP server process.
            **CRITICAL RULE for Embedding-Supported Tools:** If `design_metadata.is_custom_embedding_supported` is `true` and `crew_memory.activation` is `true`, the `initialization_params` object should be left empty (`{}`). The script generation phase will automatically use the global `rag_config`. For all other tools, specify parameters as needed.

*   `custom_tool_definitions` (Array of Objects):
    *   `class_definition_args` (Object):
        *   `name_attribute` (String)
        *   `description_attribute` (String)
        *   `run_method_parameters` (Array of Objects): Defines the parameters for the `_run` method.
            *   `name` (String): The parameter's name (e.g., "url").
            *   `python_type` (String): The parameter's Python type hint (e.g., "str").
            *   `description` (String): A description for the argument.
        *   `run_method_logic` (String)