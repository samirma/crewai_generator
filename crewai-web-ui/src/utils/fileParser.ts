import type { GeneratedFile } from "@/app/page";

export const parseFileBlocks = (script: string): GeneratedFile[] => {
  const files: GeneratedFile[] = [];
  const fileRegex = /\[START_FILE:([^\]]+)\]\n([\s\S]*?)\[END_FILE:\1\]/g;
  let match;

  while ((match = fileRegex.exec(script)) !== null) {
    const fileName = match[1];
    const fileContent = match[2].trim();
    files.push({ name: fileName, content: fileContent });
  }

  // If no file blocks are found, return the entire script as a single file
  if (files.length === 0 && script.trim().length > 0) {
    files.push({ name: "main.py", content: script });
  }

  return files;
};