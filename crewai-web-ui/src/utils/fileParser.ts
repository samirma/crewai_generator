export interface GeneratedFile {
  name: string;
  content: string;
}

const languageToExtension: Record<string, string> = {
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  json: 'json',
  js: 'js',
  ts: 'ts',
  python: 'py',
  py: 'py',
  markdown: 'md',
  md: 'md',
  html: 'html',
  css: 'css',
  sql: 'sql',
  sh: 'sh',
  bash: 'bash',
  dockerfile: 'Dockerfile',
  xml: 'xml',
  csv: 'csv',
};

const getFileNameFromLanguage = (language: string): string => {
  const ext = languageToExtension[language.toLowerCase()];
  if (ext) {
    if (ext === 'yaml') return 'config.yaml';
    if (ext === 'toml') return 'pyproject.toml';
    if (ext === 'json') return 'config.json';
    return `file.${ext}`;
  }
  return 'output.txt';
};

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

  if (files.length === 0 && script.trim().length > 0) {
    const codeBlockRegex = /^\s*```([a-zA-Z]*)\n?([\s\S]*?)\n?```\s*$/;
    const codeMatch = script.match(codeBlockRegex);
    if (codeMatch) {
      const language = codeMatch[1] || '';
      const content = codeMatch[2].trim();
      const fileName = getFileNameFromLanguage(language);
      files.push({ name: fileName, content });
    }
  }

  return files;
};