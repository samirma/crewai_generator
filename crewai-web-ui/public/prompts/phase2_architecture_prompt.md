## **CrewAI Architecture Design Blueprint (Phase 2)**

Use this document as a blueprint to achieve the goal described in the initial instruction document. Your objective is to design the optimal CrewAI configuration in a single, comprehensive JSON object. This involves developing the complete specifications for the workflow, agents, tools, and tasks. Your role is exclusively architectural design.

The design process must follow a logical, top-down cascade to ensure robustness and internal consistency. Key considerations include:

* **Self-Correction:** The architecture must include agents and tasks dedicated to quality assurance and critique, ensuring the final output meets the highest standards.
* **Clarity for Code Generation:** The design must strictly separate parameters intended for Python class constructors (`constructor_args`) from the contextual justification and rationale for those parameters (`design_metadata`).
* **Output Format:** You will ONLY output this JSON object. Your entire response must be the JSON object itself, without any preceding or succeeding text.

### **Design Section Order**

To improve the robustness and logical flow of the design, the JSON object's keys MUST be in the following order:

1.  `workflow_process`
2.  `crew_memory`
3.  `llm_registry`
4.  `agent_cadre`
5.  `structured_data_handling`
6.  `tool_repository`
7.  `custom_tool_definitions`
8.  `task_roster`

### **Canonical Tool Library for Evaluation**

To ensure a realistic and grounded design, all tool selections must be made **exclusively** from the following canonical list of available tools. The `tool_selection_justification` field within the `tool_repository` must reference this list for its evaluation.

#### `crewai_tools`

* `ScrapeWebsiteTool` (supports_embedding: `False`)
* `WebsiteSearchTool` (supports_embedding: `True`)
* `BrowserbaseTool` (supports_embedding: `False`)
* `CodeDocsSearchTool` (supports_embedding: `True`)
* `PDFSearchTool` (supports_embedding: `True`)
* `FileReadTool` (supports_embedding: `False`)
* `FileWriterTool` (supports_embedding: `False`)
* `DirectoryReadTool` (supports_embedding: `False`)
* `CSVSearchTool` (supports_embedding: `True`)
* `DOCXSearchTool` (supports_embedding: `True`)
* `JSONSearchTool` (supports_embedding: `True`)
* `MDXSearchTool` (supports_embedding: `True`)
* `RagTool` (supports_embedding: `True`)
* `TXTSearchTool` (supports_embedding: `True`)
* `XMLSearchTool` (supports_embedding: `True`)

#### MCP Servers

* **`brave`**:
    * `serverparams`: `{ "command": "npx", "args": [ "-y", "@modelcontextprotocol/server-brave-search" ], "env": { "BRAVE_API_KEY": "BRAVE_API_KEY" } }`
    * **Description**: This tool uses the Brave Search API to perform comprehensive web searches for general information and to find local businesses with detailed information like ratings and addresses, automatically falling back to a web search for non-location-specific queries or if no local results are found.
* **`excel-stdio`**:
    * `serverparams`: `{ "command": "uvx", "args": ["excel-mcp-server", "stdio"] }`
    * **Description**: This MCP server is designed to handle Excel files, allowing for reading and writing operations directly from standard input/output. It supports various Excel file formats and can be used to manipulate spreadsheet data programmatically.
* **`mcp-pandoc`**:
    * `serverparams`: `{ "command": "python", "args": ["/workspace/mcp/mcp_pandadoc_converter.py"] }`
    * **Description**: Converts a document from one format to another using Pandoc by taking a source `input_path` and a destination `output_path`, returning a string message indicating the result. The desired output format is automatically inferred from the output file's extension. Supported input formats include biblatex, bibtex, commonmark, creole, csljson, csv, docbook, docx, dokuwiki, endnotexml, epub, fb2, gfm, haddock, html, ipynb, jats, jira, json, latex, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, man, muse, native, odt, opml, org, ris, rst, rtf, t2t, textile, tikiwiki, tsv, twiki, and vimwiki. Supported output formats include asciidoc, beamer, commonmark, context, csljson, docbook, docx, dokuwiki, dzslides, epub, fb2, gfm, haddock, html, icml, ipynb, jats, jira, json, latex, man, markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki, ms, muse, native, odt, opml, opendocument, org, pdf, plain, pptx, revealjs, rst, rtf, s5, slidy, slideous, tei, texinfo, textile, xwiki, and zimwiki.

---

**'Design-Crew-Architecture-Plan' - JSON Schema:**

* `workflow_process` (Object):
    * `selected_process` (String): "Process.sequential" OR "Process.hierarchical".
    * `justification` (String): Explanation of why this process is optimal, referencing the specific steps in the Blueprint's Execution Outline.
    * `manager_llm_specification` (Object, Optional): Required if `selected_process` is "Process.hierarchical".
        * `llm_id` (String): The identifier for the manager's LLM, chosen from the `llm_registry`.
        * `rationale` (String): Justification for this manager LLM choice, referencing its capabilities (e.g., 'reasoner') from the `llm_registry`.

* `crew_memory` (Object, Optional):
    * `activation` (Boolean): `True` to enable memory.
    * `rationale` (String, Optional): Why memory is crucial for this crew.
    * `embedder_config` (Object, Optional): Required if `activation` is `True`.
        * `provider` (String): The name of the embedding provider (e.g., "ollama").
        * `config` (Object): Provider-specific configuration.
            * `model` (String): The model name (e.g., "nomic-embed-text:latest").
            * `base_url_env_var` (String, Optional): **Required for providers like 'ollama'.** The environment variable holding the base URL (e.g., "OLLAMA_HOST").
        * `rationale` (String): Justification for the embedder choice.

* `llm_registry` (Array of Objects): A central list defining the complete set of approved LLM configurations for this crew. This list is **pre-defined** and must be populated exactly as follows:
    * `llm_id` (String): A unique identifier for this configuration (e.g., "gemini_pro_reasoner", "deepseek_chat_basic").
    * `model` (String): The model name.
    * `reasoner` (Boolean): `True` if the model has strong reasoning capabilities.
    * `multimodal_support` (Boolean): `True` if the model can process images.
    * `frequency_penalty` (Number): MUST BE 0.0.
    * `presence_penalty` (Number): MUST BE 0.0.
    * `timeout` (Number): The request timeout in seconds.**
    * `max_tokens` (Number): The maximum number of tokens for the model's response.**
    * `api_key` (String, Optional): Environment variable name for the API key.
    * **Pre-defined List to Use:**
        * `gemini/gemini-2.5-flash` (reasoner: True, multimodal_support: True, timeout: 600, max_tokens: 65536, temperature: 0.0)
        * `deepseek/deepseek-chat` (reasoner: False, multimodal_support: False, timeout: 600, max_tokens: 8000, temperature: 0.2)

* `agent_cadre` (Array of Objects): Each object represents an agent. The structure separates constructor arguments from design rationale.
    * `design_metadata` (Object): Contains contextual information and justifications, not used for code generation.
        * `multimodal` (Boolean): `True` ONLY if this agent needs to process both text and images.
        * `llm_rationale` (String): Justification for the chosen `llm_id`. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability.
        * `delegation_rationale` (String): Justification for the `allow_delegation` setting.
    * `constructor_args` (Object): Contains only the parameters for the CrewAI `Agent` class constructor.
        * `role` (String): Concise functional title that defines the agent's expertise. This acts as the primary identifier for the agent.
        * `goal` (String): A single, focused sentence describing the agent's primary objective and what it is responsible for.
        * `backstory` (String): A narrative that reinforces the agent's expertise and persona, giving it context and personality. This should align with its role and goal.
        * `llm_id` (String): The identifier of the LLM to be used by this agent, referencing an entry in the `llm_registry`.
        * `allow_delegation` (Boolean): `True` or `False`.

* `structured_data_handling` (Object, Optional):
    * `usage` (Boolean): `True` if Pydantic models are used.
    * `rationale` (String, Optional): Explanation of how using Pydantic models enhances reliability.
    * **CRITICAL RULE FOR LISTS:** If a task's `expected_output` is a list of structured items, you MUST define two Pydantic models: 1) A model for the single item, and 2) A "wrapper" model that contains a `typing.List` of the single item model.
    * **CRITICAL RULE FOR OPTIONAL FIELDS:** To prevent validation errors from incomplete or missing data, **ALL fields** within a Pydantic model **MUST be defined as optional**. To do this, use the `Optional` type from Python's `typing` library. The type string in the `fields` object must follow the format `Optional[<type>]`. For example, an optional string is `"Optional[str]"` and an optional list of integers is `"Optional[List[int]]"`.
    * `model_definitions` (Array of Objects, Optional):
        * `class_name` (String): Python class name.
        * `fields` (Object): Dictionary of field names to their Python type strings. Remember to follow all critical rules defined above for every field.

* `tool_repository` (Array of Objects): Each object defines a unique tool to be instantiated, separating design rationale from instantiation parameters.
    * `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        * `required_functionality` (String): A clear, one-sentence description of the specific action the tool must perform.
        * `crewai_tool_evaluation` (Array of Objects): An evaluation of relevant crewai tools.
            * `tool_selection_justification` (String): Review the **Canonical Tool Library** provided above (including both `crewai_tools` and `MCP Servers`) to identify the most suitable tool. Your analysis MUST explain why your chosen tool is optimal and why other relevant tools are not sufficient. Justify why a standard tool or an MCP server is the better choice for the task.
            * `is_valid_availiable_tool` (Boolean): `True` or `False`.
            * `tool_name` (String): The exact, importable CrewAI tool class. **Crucially, this name must match the latest library version.** For MCP Servers, this will be `MCPServerAdapter`.
        * `is_custom_tool` (Boolean): `True` if no available tool is sufficient, derived from the analysis.
        * `is_custom_embedding_supported` (Boolean): `True` if this selected tool supports embedding, e.g (PDFSearchTool, TXTSearchTool and RagTool, etc)
        * `tool_llm_specification` (Object, Optional): **Required if `is_custom_embedding_supported` is `True` and `crew_memory.activation` is `True`.**
            * `llm_id` (String): The identifier for the tool's internal LLM, chosen from the `llm_registry`.
            * `rationale` (String): Justification for this LLM choice for the tool's internal processing (e.g., summarization).
    * `constructor_args` (Object): Contains only the parameters for the tool's class constructor.
        * `tool_id` (String): A unique identifier for this specific tool instance (e.g., "web_search_tool", "web_scout_adapter"). This acts as the primary identifier for the tool.
        * `class_name` (String): The exact Python class name to instantiate. **This must be a verbatim, up-to-date class name from the `crewai_tools` library.**
        * `initialization_params` (Object, Optional): Constructor parameters for the tool.
            **CRITICAL RULE for MCP Servers:** If using an MCP Server, the `class_name` MUST be `MCPServerAdapter`. The `initialization_params` object MUST contain a single key: `serverparams`. This `serverparams` object must contain two keys: `command` (String) and `args` (Array of Strings), which define how to run the MCP server process.
            **CRITICAL RULE for Embedding-Supported Tools:** If `design_metadata.is_custom_embedding_supported` is `true` and `crew_memory.activation` is `true`, the `initialization_params` object should be left empty (`{}`). The script generation phase will automatically use the global `rag_config`. For all other tools, specify parameters as needed.

* `custom_tool_definitions` (Array of Objects):
    * `class_definition_args` (Object):
        * `name_attribute` (String)
        * `description_attribute` (String)
        * `args_pydantic_model` (String): **(Now Mandatory if arguments exist)** The class name for the Pydantic arguments model (e.g., "PDFDownloaderToolArgs").
        * `run_method_parameters` (Array of Objects): **(Newly Added Field)** Defines the parameters for the `_run` method.
            * `name` (String): The parameter's name (e.g., "url").
            * `python_type` (String): The parameter's Python type hint (e.g., "str").
            * `description` (String): A description for the Pydantic `Field`.
        * `run_method_logic` (String)

* `task_roster` (Array of Objects): **This is the most critical section of the design.** Adhere to the "80/20 Rule" of CrewAI development: 80% of the crew's success comes from meticulously designed tasks. Each task definition must be treated as a direct, precise set of instructions for a new team member who needs explicit guidance. Each object represents a task, separating design rationale from instantiation parameters.
    * `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        * `task_identifier` (String): A unique name for the task, used for context linking.
        * `quality_gate` (String): A high-level, human-readable statement of the success criteria for this task. This should answer the question: "How do we know this task was completed successfully and correctly?" It acts as a final check on the `expected_output`, ensuring it aligns with the overall goals of the project.
        * `tool_rationale` (String, Optional): Justification for why specific tools are chosen for this task.
        * `output_pydantic_rationale` (String, Optional): Justification for using a Pydantic model for the output.
    * `constructor_args` (Object): Contains only the parameters for the CrewAI `Task` class constructor.
        * `description` (String): **CRITICAL RULE:** This must be a highly specific, action-oriented prompt written **directly to the agent**. This is not a comment; it is the core instruction. It must use active verbs and break down the process into clear, logical steps. It should explicitly state *how* the agent should use its tools and the context it receives.
        * `agent` (String): The `role` of the designated agent.
        * `expected_output` (String): **CRITICAL RULE:** This must be a precise description of the **successful outcome** of the task. It goes beyond just naming the output artifact. It must define the **qualities, structure, and format** of the result. For example, instead of "A JSON object", write "A JSON object that strictly validates against the `TailoredResume` Pydantic model, with a `summary` field that is no more than 3 sentences and directly mentions keywords from the target job description." **It must be a clear, measurable definition of 'done'.**
        * `tools` (Array of Strings, Optional): List of `tool_id`s from the `tool_repository`. **For MCP Servers, the agent gains access to all tools provided by the server. You must pass the `.tools` property of the adapter instance to the task, so here you should reference the `tool_id` of the adapter itself (e.g., "web_scout_adapter").**
        * `context` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
        * `output_pydantic` (String, Optional): The `class_name` of a Pydantic model for structured output.