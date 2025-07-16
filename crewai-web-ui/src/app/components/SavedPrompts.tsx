import React from 'react';

interface Prompt {
  title: string;
  prompt: string;
}

interface SavedPromptsProps {
  prompts: Prompt[];
  onSelectPrompt: (prompt: string) => void;
  onDeletePrompt: (title: string) => void;
}

const SavedPrompts: React.FC<SavedPromptsProps> = ({ prompts, onSelectPrompt, onDeletePrompt }) => {
  return (
    <div className="p-4 border-r border-slate-200 dark:border-slate-700">
      <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Saved Prompts</h2>
      <ul>
        {prompts.map((p, index) => (
          <li
            key={index}
            className="flex justify-between items-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <span className="cursor-pointer" onClick={() => onSelectPrompt(p.prompt)}>
              {p.title}
            </span>
            <button
              onClick={() => onDeletePrompt(p.title)}
              className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedPrompts;
