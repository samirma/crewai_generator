export const buildPrompt = (
  userInput: string,
  phase1Text: string | null,
  phase2Text: string | null,
  phase3Text: string | null
): string => {
  const parts: string[] = [];

  // Condition 1: phase1Text is not null and not just whitespace
  if (phase1Text && phase1Text.trim() !== "") {
    parts.push(`

User Instruction: @@@${userInput}@@@
${phase1Text}`);
  }
  // Condition 2: phase1Text is an empty string, AND it's the ONLY phase text provided.
  else if (phase1Text !== null && phase1Text.trim() === "" &&
           (phase2Text === null || phase2Text.trim() === "") &&
           (phase3Text === null || phase3Text.trim() === "")) {
    parts.push(`

User Instruction: @@@${userInput}@@@
${phase1Text}`);
  }

  if (phase2Text && phase2Text.trim() !== "") {
    parts.push(phase2Text);
  }

  if (phase3Text && phase3Text.trim() !== "") {
    parts.push(phase3Text);
  }

  return parts.join("\n\n"); // Corrected line
};
