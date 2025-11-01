
* **Instruction:** Use the 'Detailed Architecture Plan' as the source of truth.
* **Objective:** Your task is to select the appropriate tools for each task from the 'Canonical Tool Library'. If no suitable tool is available, you must identify that a custom tool is required.
* **Output Structure:** The output should be a JSON object with a single key: `task_roster`.
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.

### **Canonical Tool Library for Evaluation**

To ensure a realistic and grounded design, all tool selections must be made **exclusively** from the following canonical list of available tools. The `tool_selection_justification` field within the `tool_repository` must reference this list for its evaluation.

#### `crewai_tools`

* `ScrapeWebsiteTool` (supports_embedding: `False`, **tool_id: `website_scraper`**)
* `WebsiteSearchTool` (supports_embedding: `True`, **tool_id: `website_searcher`**)
* `BrowserbaseTool` (supports_embedding: `False`, **tool_id: `browserbase_tool`**)
* `CodeDocsSearchTool` (supports_embedding: `True`, **tool_id: `code_docs_searcher`**)
* `PDFSearchTool` (supports_embedding: `True`, **tool_id: `pdf_searcher`**)
* `FileReadTool` (supports_embedding: `False`, **tool_id: `file_reader`**)
* `FileWriterTool` (supports_embedding: `False`, **tool_id: `file_writer`**)
* `DirectoryReadTool` (supports_embedding: `False`, **tool_id: `directory_reader`**)
* `CSVSearchTool` (supports_embedding: `True`, **tool_id: `csv_searcher`**)
* `DOCXSearchTool` (supports_embedding: `True`, **tool_id: `docx_searcher`**)
* `MDXSearchTool` (supports_embedding: `True`, **tool_id: `mdx_searcher`**)
* `RagTool` (supports_embedding: `True`, **tool_id: `rag_tool`**)
* `TXTSearchTool` (supports_embedding: `True`, **tool_id: `txt_searcher`**)
* `XMLSearchTool` (supports_embedding: `True`, **tool_id: `xml_searcher`**)

#### MCP Servers (Accessed via `MCPServerAdapter`)

* **`mcp-local-seaxng`**: (**tool_id: `mcp_searxng_adapter`**)
    * `serverparams`: `{ "command": "python", "args": ["/workspace/mcp/mcp_searxng.py"] }`
    * **Description**: This tool performs a web search based on a text query and an optional pageno for pagination. It returns a JSON formatted list of search results, with each result containing its url, title, and a only a snippet of the content. A scrape tool is required to get more information from each result.
* **`time-stdio`**: (**tool_id: `mcp_time_adapter`**)
    * `serverparams`: `{   "command": "uvx",  "args": ["mcp-server-time"]    }`
    * **Description**: The Time MCP Server integrates with LLMs to provide accurate time information and timezone conversion capabilities. This server uses IANA timezone names and can automatically detect your system's timezone, allowing AI models to work with real-time temporal data and have date-time awareness for all tasks that require it.
* **`excel-stdio`**: (**tool_id: `mcp_excel_adapter`**)
    * `serverparams`: `{ "command": "uvx", "args": ["excel-mcp-server", "stdio"] }`
    * **Description**: This MCP server is designed to handle Excel files, allowing for reading and writing operations directly from standard input/output. It supports various Excel file formats and can be used to manipulate spreadsheet data programmatically.
* **`mcp-pandoc`**: (**tool_id: `mcp_pandoc_adapter`**)
    * `serverparams`: `{ "command": "python", "args": ["/workspace/mcp/mcp_pandadoc_converter.py"] }`
    * **Description**: Converts a document from one format to another using Pandoc by taking a source `input_path` and a destination `output_path`, returning a string message indicating the result. The desired output format is automatically inferred from the output file's extension. Supported input formats include biblatex, bibtex, commonmark, creole, csljson, csv, docbook, docx, dokuwiki, endnotexml, epub, fb2, gfm, haddock, html, ipynb, jats, jira, json, latex, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, man, muse, native, odt, opml, org, ris, rst, rtf, t2t, textile, tikiwiki, tsv, twiki, and vimwiki. Supported output formats include asciidoc, beamer, commonmark, context, csljson, docbook, docx, dokuwiki, dzslides, epub, fb2, gfm, haddock, html, icml, ipynb, jats, jira, json, latex, man, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, ms, muse, native, odt, opml, opendocument, org, pdf, plain, pptx, revealjs, rst, rtf, s5, slidy, slideous, tei, texinfo, textile, xwiki, and zimwiki.

---

**'Tool-Selection-Plan' - JSON Schema:**

*   `task_roster` (Array of Objects): Each object represents a task, with tool selection details.
    *   `task_identifier` (String): From the detailed plan.
    *   `tools` (Array of Objects, Optional): Defines instances of tools selected exclusively from the provided 'Canonical Tool Library'.
        *   `design_metadata` (Object):
            *   `required_functionality` (String): A clear, one-sentence description of the specific action the tool must perform.
            *   `crewai_tool_evaluation` (Array of Objects):
                *   `tool_selection_justification` (String): Justify the choice of tool from the Canonical Tool Library.
                *   `is_valid_availiable_tool` (Boolean): `True` or `False`.
                *   `tool_name` (String): The exact, importable CrewAI tool class.
            *   `is_custom_tool` (Boolean): `True` if no available tool is sufficient.
            *   `is_custom_embedding_supported` (Boolean): `True` if this selected tool supports embedding.
            *   `tool_llm_specification` (Object, Optional): Required if `is_custom_embedding_supported` is `True` and `crew_memory.activation` is `True`.
                *   `llm_id` (String): The identifier for the tool's internal LLM.
                *   `rationale` (String): Justification for this LLM choice.
        *   `canonical_tool` (Object): Contains only the parameters for the tool's class constructor only if `is_custom_tool` is `False`.
            *   `tool_id` (String): A unique identifier for this specific tool instance.
            *   `class_name` (String): The exact Python class name to instantiate.
            *   `initialization_params` (Object, Optional): Constructor parameters for the tool.
            **CRITICAL RULE for MCP Servers:** If using an MCP Server, the `class_name` MUST be `MCPServerAdapter`. The `initialization_params` object MUST contain a single key: `serverparams`. This `serverparams` object must contain two keys: `command` (String) and `args` (Array of Strings), which define how to run the MCP server process.
            **CRITICAL RULE for Embedding-Supported Tools:** If `design_metadata.is_custom_embedding_supported` is `true` and `crew_memory.activation` is `true`, the `initialization_params` object should be left empty (`{}`). The script generation phase will automatically use the global `rag_config`. For all other tools, specify parameters as needed.
