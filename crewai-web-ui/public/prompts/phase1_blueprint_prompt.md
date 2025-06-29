## Detailed Instruction Document: [Derived Title based on Initial Instruction]

### 1. Objective/Purpose
Clearly state the primary goal or desired outcome of executing this instruction. This should be a concise, high-level summary of the project's "why."

### 2. Initial Instruction Reference
Quote the original 'Initial Instruction Input' for context.

### 3. Key Decisions & Assumptions
List any critical decisions made during the development of this instruction and any underlying assumptions that must hold true for the instruction to be valid or successful. This includes constraints, scope limitations, and foundational beliefs about the environment or inputs.

### 4. Logical Steps
Provide a detailed, step-by-step breakdown of the entire process. This is the core of the document and will serve as the direct foundation for the architecture in the next phase. The steps must be **strictly atomic** and logically sequential. An atomic step represents a single, indivisible action. For instance, a common pattern like "Read a file, process its data, and write a new file" must be broken down into three distinct steps: 1. Read the source file into memory. 2. Process the in-memory data to generate new content. 3. Write the new content from memory to the destination file. This ensures each step has one clear responsibility.

For **each step** in the numbered list, you must include the following sub-sections:
*   **step_id:** A unique, human-readable identifier for this step (e.g., "read_profile_data", "analyze_profile_content", "save_profile_summary"). This ID is critical for traceability.
*   **Action:** A clear, concise description of the **single primary action** to be performed in this step. Use a single, strong active verb phrase (e.g., "Read file content", "Analyze user profile data", "Save summary to Markdown file").
*   **Inputs for this step:** Detail the specific data or artifacts required to begin this step (e.g., "Output of step 'read_profile_data'", "User-provided URL").
*   **A single output of this step:** Describe the **single, tangible artifact or state change** that results from this step. This output must be singular and specific. It can be an in-memory data structure (e.g., "A Python dictionary containing user skills"), a specific file (e.g., "A summary text file named `summary.md`"), or a decision (e.g., "The URL of the selected job posting"). A step cannot produce both an in-memory object and a file simultaneously.
*   **Error Handling & Edge Cases:** Identify potential issues for this specific step and how they should be managed (e.g., "If the API call fails, retry up to 3 times," "If the input file is empty, terminate with an error message").
*   **Success Criteria for this step:** Define a measurable, verifiable condition that proves this individual step was completed successfully (e.g., "The output file `summary.md` exists and is not empty," "The in-memory dictionary is not None and contains the key 'skills'").

### 5. Example Scenario (Optional but Recommended)
Provide a concrete example of an 'Overall Expected Input' and the corresponding 'Final Expected Output' to illustrate the instruction's functionality. A clear example is highly valuable for guiding the subsequent AI generation phases.