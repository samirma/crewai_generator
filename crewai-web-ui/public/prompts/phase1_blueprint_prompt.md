**Input:** User-provided 'Initial Instruction Input' (from the `@@@` delimiters).

**Goal:** Transform the raw input into a structured **Logic Plan**. This plan is the foundational logic that will be later converted into a concrete execution plan with Agents and Tasks. The focus should be on *what* needs to be done logically and the flow of data, rather than implementation details.

**Process:**
1.  **Analyze:** Deeply understand the user's request, identifying the core objective, explicit constraints, and implicit needs.
2.  **Structure:** Organize the requirements into a logical flow.
3.  **Formulate:** Create the Blueprint with a focus on value and logical progression.

**Output:** A 'Blueprint' document within `{{{ }}}` delimiters.

**'Blueprint' - Mandatory Sections:**

**A. Primary Objective:**
*   **Goal:** A clear, single-sentence statement of what needs to be achieved.
*   **Value:** Why is this being done? What is the intended outcome for the user?
*   **Requiments:** A detailed list of all requiriments stated by the user.

**B. Logic Plan:**
*   **Description:** A high-level logical flow of how to solve the problem fullfilling all requiriments considering that steps should be planned considering the dependencies between steps, the inputs and outputs of each step and the final deliverables and previous and next steps.
*   **Structure in list of steps:** Break the solution down into **Logical Steps**.
    *   **Step Name:** A descriptive name for the logical step.
    *   **Purpose:** What does this step achieve?
    *   **Inputs:** What information is needed to start this step? (e.g., 'Raw Resume Data', 'Search Query').
    *   **Execution Flow:** Is this step sequential, parallel (async), or conditional?
    *   **Logic Conditions:** If conditional, what is the criteria? (e.g. "If step A output is empty, do B").
    *   **High-Level Logic:** Describe the transformation or action (e.g., 'Analyze text for keywords', 'Generate improvement suggestions').
    *   **Outputs:** What is the result of this step? (e.g., 'Structured Analysis', 'Refined Text'). **refer to a proper Deliverable from Section C if applicable.**
*   **Note:** Focus on the *flow of information* and *decision points*.

**C. Final Deliverables & Success Criteria:**
*   **Deliverables:**
    *   **File Deliverables, when required by the initial instruction:**
        *   **Description:** List ALL files that need to be saved to the filesystem, only if needed.
        *   **Schema for each file:**
            *   **Deliverable Name:** Descriptive name.
            *   **Description:** What does this file contain?
            *   **Format:** (e.g., 'JSON', 'Markdown', 'Python').
            *   **Location:** **MANDATORY.** The absolute path where the file must be saved (e.g., '/tmp/output.json').
    *   **Main Output (Return Value, when needed):**
        *   **Description:** The primary string content that should be returned to the user. This is a single grouped string. This output is optional, only if needed.
        *   **Schema:**
            *   **Deliverable Name:** "Main Output String"
            *   **Description:** Summary of the returned content.
            *   **Format:** 'String'
*   **Success Criteria:**
    *   How do we know if the task was successful? (e.g., "The file was created at the specified path and the returned string contains the corrected text").

**D. Information Assets & Constraints:**
*   **Data Sources:** List ALL files, URLs, or external data sources mentioned.
*   **Technical Specifications:** Any specific tools, libraries (e.g., React, Python), or APIs mentioned.
*   **Context/Constraints:** Tone, audience, specific exclusions, or environmental constraints.

**E. Clarified Assumptions:**
*   Explicitly state any assumptions made to fill in gaps in the user's request.
