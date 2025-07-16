import React from 'react';

interface Prompt {
  title: string;
  prompt: string;
}

interface SavedPromptsProps {
  prompts: Prompt[];
  onSelectPrompt: (prompt: string) => void;
}

const SavedPrompts: React.FC<SavedPromptsProps> = ({ prompts, onSelectPrompt }) => {
  return (
    <div className="p-4 border-r border-slate-200 dark:border-slate-700">
      <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Saved Prompts</h2>
      <ul>
        {prompts.map((p, index) => (
          <li
            key={index}
            className="cursor-pointer p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => onSelectPrompt(p.prompt)}
          >
            {p.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedPrompts;
