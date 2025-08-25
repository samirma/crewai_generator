
* **Instruction:** Only use the document identified as 'Project Blueprint' within `{{{ }}}` as your sole source of truth.
* **Objective:** Your task is to design a complete and optimal CrewAI configuration. This design must fully implement the goals from the 'Project Blueprint'. Your role is strictly that of an architect; you are not to write code or execute the plan.
* **Self-Correction:** The final design must include agents and tasks specifically for quality assurance and critique to ensure the output is of the highest quality.
* **Output Structure:** The design must clearly separate the technical parameters for Python class constructors (`constructor_args`) from the contextual justification and rationale for those parameters (`design_metadata`).
* **Final Output Format:** Your entire response must be a single, comprehensive JSON object. Do not include any other text before or after the JSON.


### **Design Section Order**

To improve the robustness and logical flow of the design, the JSON object's keys MUST be in the following order:

1.  `workflow_process`
2.  `crew_memory`
3.  `llm_registry`
4.  `agent_cadre`
5.  `tool_repository`
6.  `custom_tool_definitions`
7.  `pydantic_model_definitions`
8.  `task_roster`

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

**'Design-Crew-Architecture-Plan' - JSON Schema:**

*   `workflow_process` (Object):
    *   `rationale` (String): The Justification for the choice between Process.sequential and Process.hierarchical, which determined by the complexity and interdependencies of the project goals. Process.sequential is best for linear, straightforward tasks with a clear, predetermined order, where the output of one task is the direct input for the next. This model ensures precise and orderly progression and is suitable for projects with low to medium complexity. In contrast, Process.hierarchical is the ideal choice for complex, multi-stage projects that require dynamic, multi-agent collaboration, where a manager agent delegates tasks to specialized worker agents to achieve a common goal. This model is selected when the solution benefits from a variety of specialized perspectives and complex, non-linear workflows."
    *   `selected_process` (String): `Process.sequential` OR `Process.hierarchical`.

*   `crew_memory` (Object):
    *   `rationale` (String): Justification for enablding or not the support for memory in crewai.
    *   `activation` (Boolean): `True` to enable memory.
    *   `embedder_config` (Object, Optional): Required if `activation` is `True` else 'False'.
        *   `provider` (String): The name of the embedding provider (e.g., "ollama").
        *   `config` (Object): Provider-specific configuration.
            *   `model` (String): The model name (e.g., "mxbai-embed-large:latest").
            *   `base_url_env_var` (String, Optional): **Required for providers like 'ollama'.** The environment variable holding the base URL (e.g., "OLLAMA_HOST").
        *   `rationale` (String): Justification for the embedder choice.

*   `llm_registry` (Array of Objects): A central list defining the complete set of approved LLM configurations for this crew. This list is **pre-defined** and must be populated exactly as specified. Each object separates metadata from instantiation parameters.
    *   `design_metadata` (Object): Contains contextual information about the LLM configuration.
        *   `llm_id` (String): A unique identifier for this configuration (e.g., "gemini_pro_reasoner", "deepseek_chat_basic"). This will be used to name the Python variable.
        *   `reasoner` (Boolean): `True` if the model has strong reasoning capabilities.
        *   `multimodal_support` (Boolean): `True` if the model can process images.
        *   `rationale` (String): Justification for including this LLM in the registry, highlighting its key strengths for the crew.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `LLM` class constructor.
        *   `model` (String): The model name string required by the provider.
        *   `temperature` (Number): The sampling temperature.
        *   `frequency_penalty` (Number)
        *   `presence_penalty` (Number)
        *   `timeout` (Number): The request timeout in seconds.
        *   `max_tokens` (Number): The maximum number of tokens for the model's response.
        *   `api_key` (String, Optional): Environment variable name for the API key.
    *   **Pre-defined List to Use:**
```json
[
  {
    "design_metadata": {
      "llm_id": "gemini/gemini-2.5-flash",
      "reasoner": true,
      "multimodal_support": true,
      "rationale": "A high-performance, cost-effective model from Google, excellent for complex reasoning, long-context understanding, and multimodal tasks. Ideal for manager agents or agents requiring deep analysis."
    },
    "constructor_args": {
      "model": "gemini/gemini-2.5-flash",
      "timeout": 600,
      "api_key": "GEMINI_API_KEY"
    }
  },
  {
    "design_metadata": {
      "llm_id": "qwen-3-235b-a22b-instruct",
      "reasoner": false,
      "multimodal_support": false,
      "rationale": "A powerful non-thinking model with 235 billion parameters, excelling in instruction following, multilingual tasks, and efficient text generation at speeds exceeding 1,400 tokens per second. Ideal for worker agents handling high-volume, general-purpose tasks."
    },
    "constructor_args": {
      "model": "cerebras/qwen-3-235b-a22b-instruct-2507",
      "timeout": 600,
      "api_key": "CEREBRAS_API_KEY",
      "base_url": "https://api.cerebras.ai/v1"
    }
  },
  {
    "design_metadata": {
      "llm_id": "qwen-3-235b-a22b-thinking-2507",
      "reasoner": true,
      "multimodal_support": false,
      "rationale": "An advanced reasoning model designed for complex, multi-step tasks such as logical reasoning, mathematics, and coding. It can complete intricate reasoning processes very quickly, making it suitable for agents requiring deep analysis and problem-solving capabilities."
    },
    "constructor_args": {
      "model": "cerebras/qwen-3-235b-a22b-thinking-2507",
      "timeout": 600,
      "api_key": "CEREBRAS_API_KEY",
      "base_url": "https://api.cerebras.ai/v1"
    }
  },
  {
    "design_metadata": {
      "llm_id": "deepseek_chat_worker",
      "reasoner": false,
      "multimodal_support": false,
      "rationale": "A capable and efficient model for general-purpose tasks like writing, summarization, and data extraction. A good choice for worker agents that don't require advanced reasoning."
    },
    "constructor_args": {
      "model": "deepseek/deepseek-chat",
      "timeout": 600,
      "api_key": "DEEPSEEK_API_KEY"
    }
  }
]
```

*   `agent_cadre` (Array of Objects): Each object represents an agent. The structure separates constructor arguments from design rationale.
    *   `design_metadata` (Object): Contains contextual information and justifications, not used for code generation.
        *   `multimodal` (Boolean): `True` ONLY if this agent needs to process both text and images.
        *   `llm_rationale` (String): Justification for the chosen `llm_id`. If `multimodal` is `True`, this rationale MUST confirm the selected model has `multimodal_support=True`. It should also reference the model's 'reasoner' capability.
        *   `delegation_rationale` (String): Justification for the `allow_delegation` setting.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `Agent` class constructor.
        *   `role` (String): Concise functional title that defines the agent's expertise. This acts as the primary identifier for the agent.
        *   `goal` (String): A single, focused sentence describing the agent's primary objective and what it is responsible for.
        *   `backstory` (String): A narrative that reinforces the agent's expertise and persona, giving it context and personality. This should align with its role and goal.
        *   `llm_id` (String): The identifier of the LLM to be used by this agent, referencing an entry in the `llm_registry`.
        *   `tools` (Array of Strings, Optional): List of `tool_id`s from the `tool_repository` that this agent is equipped with. **For MCP Servers, the agent gains access to all tools provided by the server. You must reference the `tool_id` of the adapter itself (e.g., "web_scout_adapter").**
        *   `allow_delegation` (Boolean): `True` or `False`.

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

*   `pydantic_model_definitions` (Array of Objects): Defines the Pydantic models for structured task outputs.
    *   `model_id` (String): A unique identifier for the model, which will become the Python class name (e.g., "ProfileAnalysisResult").
    *   `model_description` (String): A docstring for the Pydantic model class, explaining its purpose.
    *   `is_root_model` (Boolean): **Set to `true` if the model should wrap a single type (like `List[str]`). Set to `false` for a standard model with multiple named fields.**
    *   `model_fields` (Array of Objects): A list of fields for the model.
        *   **If `is_root_model` is `true`:** This array MUST contain exactly one object. The `name` can be a placeholder like `"root"`, and the `python_type` defines the type the `RootModel` will wrap (e.g., `List[str]`).
        *   **If `is_root_model` is `false`:** This array contains all the named fields for a standard `BaseModel`.
        *   `name` (String): The name of the attribute (e.g., "summary", "skills_list"). **Must NOT be `__root__`**.
        *   `python_type` (String): The Python type hint for the field (e.g., "str", "List[str]", "Optional[int]").
        *   `description` (String): A clear description of the field's content, used for the Pydantic `Field` description.

*   `task_roster` (Array of Objects): **This is the most critical section of the design.** Considering `selected_process` of `workflow_process`. Each task definition must be treated as a direct, precise set of instructions for a new team member who needs explicit guidance. Each object represents a task, separating design rationale from instantiation parameters.
    *   `design_metadata` (Object): Contains contextual information and justifications, not used directly for code generation.
        *   `task_identifier` (String): A unique name for the task, used for context linking.
        *   **`blueprint_reference` (String): The `step_id` from the Phase 1 Blueprint's 'Logical Steps' that this task implements. This is mandatory for traceability.**
        *   **`blueprint_step_action` (String): A direct copy of the 'Action' from the corresponding blueprint step.**
        *   **`blueprint_step_success_criteria` (String): A direct copy of the 'Success Criteria for this step' from the corresponding blueprint step.**
        *   **`blueprint_step_error_handling` (String): A direct copy of the 'Error Handling & Edge Cases' from the corresponding blueprint step.**
        *   `quality_gate` (String): A high-level, human-readable statement of the success criteria for this task. This should answer the question: "How do we know this task was completed successfully and correctly?" It acts as a final check on the `expected_output`, ensuring it aligns with the overall goals of the project.
        *   `tool_rationale` (String, Optional): Justification for why the assigned agent needs specific tools to complete this task.
        *   `output_rationale` (String, Optional): Justification for using a for the output.
    *   `constructor_args` (Object): Contains only the parameters for the CrewAI `Task` class constructor.
        *   `description` (String): **CRITICAL RULE:** This must be a highly specific, action-oriented prompt written **directly to the agent**. This is not a comment; it is the core instruction. It must be a synthesis of the `blueprint_step_action`, incorporating guidance on how to handle potential issues from `blueprint_step_error_handling`. It must use active verbs and break down the process into clear, logical steps. It should explicitly state *how* the agent should use its tools and the context it receives. **Crucially, if the task's ultimate goal is to create a file, the final step in the description MUST be an unambiguous command to use the file-writing tool to save the generated content to a specific file path.** For example: "...Finally, you MUST use the `file_writer_tool` to save this content to `{output_path}`."
        *   `agent` (String): The `role` of the designated agent.
        *   `expected_output` (String): **CRITICAL RULE:** This must be a precise description of the **final artifact and its state** that proves the task was successfully completed.
            > **If using a Pydantic model (`output_json` is set):** This description must detail the *expected content* that will populate the fields of the Pydantic model. For example: "A fully populated Pydantic object containing a concise summary of the user's profile, a list of their technical skills, and a list of their soft skills."
            > **If creating a file:** The description MUST start by confirming the file's creation. Instead of describing only the content (e.g., "A JSON object..."), it must be phrased as: "**A file named `{file_path}` is successfully created in the file system.** The content of this file must be a {description of content, e.g., 'valid JSON object with the keys `summary`, `experience`, and `skills`'}." This makes the physical existence of the file the primary success criterion.
        *   `output_json` (String, Optional): The `model_id` of the Pydantic model (from `pydantic_model_definitions`) that this task must output. If this is specified, the task's result will be an instance of this Pydantic class.
        *   `context` (Array of Strings, Optional): List of prerequisite `task_identifier`s.
        *   `tools` (Array of Strings, Optional): List of tool_ids from the tool_repository. For MCP Servers, the agent gains access to all tools provided by the server. You must pass the .tools property of the adapter instance to the task, so here you should reference the tool_id of the adapter itself (e.g., "web_scout_adapter").
