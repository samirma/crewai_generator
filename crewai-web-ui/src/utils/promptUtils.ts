export const buildPrompt = (
  userInput: string,
  phase1TextTemplate: string | null,
  phase2TextTemplate: string | null,
  phase3TextTemplate: string | null,
  previousPhaseOutput?: string | null,
  currentPhaseNumber?: 1 | 2 | 3
): string => {
  const userInputSection = `@@@${userInput}@@@`;

  // Multi-step Phase 1
  if (currentPhaseNumber === 1) {
    return phase1TextTemplate ? phase1TextTemplate.replace("@@@userInput@@@", userInputSection) : userInputSection;
  }

  // Multi-step Phase 2
  if (currentPhaseNumber === 2 && phase2TextTemplate) {
    return `${previousPhaseOutput || ""}\n\n${phase2TextTemplate}`;
  }

  // Multi-step Phase 3
  if (currentPhaseNumber === 3 && phase3TextTemplate) {
    return `${previousPhaseOutput || ""}\n\n${phase3TextTemplate}`;
  }

  // Single-step mode (no currentPhaseNumber)
  if (!currentPhaseNumber) {
    const parts: string[] = [];
    if (phase1TextTemplate) {
      parts.push(phase1TextTemplate.replace("@@@userInput@@@", userInputSection));
    }
    if (phase2TextTemplate) {
      parts.push(phase2TextTemplate);
    }
    if (phase3TextTemplate) {
      parts.push(phase3TextTemplate);
    }
    // Ensure that if only userInput is provided (all templates are null),
    // it still returns the userInputSection for single-step.
    if (parts.length === 0 && !phase1TextTemplate && !phase2TextTemplate && !phase3TextTemplate) {
      return userInputSection;
    }
    return parts.join("\n\n");
  }

  // Fallback for undefined conditions
  console.warn("buildPrompt: Could not determine prompt structure with given parameters.", {
    userInput,
    phase1TextTemplate,
    phase2TextTemplate,
    phase3TextTemplate,
    previousPhaseOutput,
    currentPhaseNumber
  });
  return "Error: Prompt construction failed.";
};
