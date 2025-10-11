export const parseFileBlocks = (script: string): Record<string, string> => {
  const fileBlocks: Record<string, string> = {};
  const lines = script.split('\n');
  let currentFilePath: string | null = null;
  let currentFileContent: string[] = [];

  for (const line of lines) {
    const startMatch = line.match(/\[START_FILE:(.*?)\]/);
    if (startMatch) {
      if (currentFilePath) {
        fileBlocks[currentFilePath] = currentFileContent.join('\n');
      }
      currentFilePath = startMatch[1].trim();
      currentFileContent = [];
    } else {
      const endMatch = line.match(/\[END_FILE:(.*?)\]/);
      if (endMatch) {
        if (currentFilePath) {
          fileBlocks[currentFilePath] = currentFileContent.join('\n');
          currentFilePath = null;
          currentFileContent = [];
        }
      } else if (currentFilePath) {
        currentFileContent.push(line);
      }
    }
  }

  if (currentFilePath) {
    fileBlocks[currentFilePath] = currentFileContent.join('\n');
  }

  return fileBlocks;
};