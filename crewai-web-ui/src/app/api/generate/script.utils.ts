// This file will contain script extraction and Ollama configuration utilities.

export function extractScript(llmResponseText: string): string | undefined {
  let generatedScript: string | undefined = undefined;
  let scriptToExtract = llmResponseText;

  const pythonCodeBlockRegex = /```python\n([\s\S]*?)\n```/g;
  const pythonMatches = Array.from(scriptToExtract.matchAll(pythonCodeBlockRegex));

  if (pythonMatches.length > 0) {
    generatedScript = pythonMatches[pythonMatches.length - 1][1];
    console.log(`Extracted last Python code block from markdown.`);
  } else {
    const genericCodeBlockRegex = /```\n?([\s\S]*?)\n?```/g;
    const genericMatches = Array.from(scriptToExtract.matchAll(genericCodeBlockRegex));

    if (genericMatches.length > 0) {
      generatedScript = genericMatches[genericMatches.length - 1][1].trim();
      console.log(`Extracted last generic code block from markdown.`);
    } else {
      // No markdown block detected, assume the whole response is the script
      generatedScript = scriptToExtract;
      console.log(`No markdown block detected. Using entire response as script.`);
    }
  }
  return generatedScript;
}
