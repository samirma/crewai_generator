export interface GeneratedFile {
  name: string;
  content: string;
}

// Function to strip markdown code block notations
const stripMarkdown = (content: string): string => {
  const codeBlockRegex = /^\s*```[a-zA-Z]*\n?([\s\S]*?)\n?```\s*$/;
  const match = content.match(codeBlockRegex);
  return match ? match[1].trim() : content.trim();
};

export const parseFileBlocks = (script: string): GeneratedFile[] => {
  const files: GeneratedFile[] = [];
  const fileRegex = /\[START_FILE:([^\]]+)\]\n([\s\S]*?)\[END_FILE:\1\]/g;
  let match;

  while ((match = fileRegex.exec(script)) !== null) {
    const fileName = match[1];
    const rawContent = match[2].trim();
    const cleanContent = stripMarkdown(rawContent);
    files.push({ name: fileName, content: cleanContent });
  }

  // If no file blocks are found, return the entire script as a single file
  if (files.length === 0 && script.trim().length > 0) {
    const cleanScript = stripMarkdown(script);
    files.push({ name: "main.py", content: cleanScript });
  }

  return files;
};