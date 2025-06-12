export const buildPrompt = (
  userInput: string,
  phase1Text: string | null,
  phase2Text: string | null,
  phase3Text: string | null
): string => {
  const parts: string[] = [];

  // Condition 1: phase1Text is not null and not just whitespace
  if (phase1Text && phase1Text.trim() !== "") {
    parts.push(` ${phase1Text} \n\n\n @@@${userInput}@@@`);
  }
  // Condition 2: phase1Text is an empty string, AND it's the ONLY phase text provided.


  if (phase2Text && phase2Text.trim() !== "") {
    parts.push(phase2Text);
  }

  if (phase3Text && phase3Text.trim() !== "") {
    parts.push(phase3Text);
  }

  return parts.join("\n\n"); // Corrected line
};
