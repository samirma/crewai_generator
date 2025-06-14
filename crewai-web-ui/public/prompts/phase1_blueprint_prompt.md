

Instructions markdown:
```markdown

**Process:**
1.  Thoroughly analyze the 'Initial Instruction Input' (from the `@@@` delimiters).

**A. Primary Objective:**
* Content: A single, clear statement of the main goal.

**B. Deliverable(s):**
* Content: Precise specification of ALL final outputs.
    * Filename(s) and format(s) (e.g., `analysis_report.md`, `results.json`).
    * Detailed structure (e.g., Markdown sections, JSON schema, data fields).
* Constraint: This deliverable **MUST** be the direct result of a defined task or step in the execution outline.
* Deliverable Success Criteria: How to assess the correctness and quality of the final deliverable(s).

**C. Information Assets & Technical Specifications:**
* Content:
    * List ALL required data sources/information types.
    * **File types and their intended processing** (e.g., 'extract all text from PDF `main.pdf`', 'summarize DOCX content from `report.docx`', 'query data from `data.csv`').
    * Specific URLs for web tools or external services (if any).
    * Descriptions of local files/databases (assume accessibility if mentioned).
    * Keywords/strategies for research or data gathering.
    * APIs (if any), including authentication details if provided.
    * List ALL technical specifications provided in the 'Initial Instruction Input' (e.g., required libraries, algorithms, performance constraints).
* A list of requirements omitted from the final Blueprint, and the reasoning.

**D. Success Criteria (Overall Task):**
* Content: Broader key questions, analyses, or content requirements the system must meet beyond the deliverable format.

**E. Operational Context:**
* Content: The purpose of the output and its intended audience.

**F. Clarified Assumptions:**
* Content: Explicitly state ALL assumptions made during Blueprint formulation (e.g., about data availability, interpretation of ambiguous requests).

**G. Execution Outline:**
* Content: A high-level, step-by-step workflow designed to achieve the Primary Objective.
    * Each step should clearly define its purpose, **expected input (including type/format)**, the operation to be performed, and **expected output (including type/format)**.
    * This outline **MUST** incorporate any technical specifications identified in Section C.
    * Detail the logical flow of data and operations between steps.

```

Follow the previous instructions markdown to produce a markdown block called 'Blueprint'.
