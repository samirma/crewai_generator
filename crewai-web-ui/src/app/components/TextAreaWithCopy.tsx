"use client";

import { ChangeEvent } from 'react';
import CopyButton from './CopyButton';

interface TextareaWithCopyProps {
  value: string;
  onValueChange: (value: string) => void;
  isReadOnly?: boolean;
  placeholder?: string;
  className?: string;
}

const TextareaWithCopy = ({
  value,
  onValueChange,
  isReadOnly = false,
  placeholder = '',
  className = '',
}: TextareaWithCopyProps) => {
  return (
    <div className="relative w-full">
      <textarea
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onValueChange(e.target.value)}
        readOnly={isReadOnly}
        placeholder={placeholder}
        className={`w-full p-4 pr-20 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:border-indigo-500 text-base resize-y ${className}`}
        rows={10}
      />
      <div className="absolute top-3 right-3">
        <CopyButton textToCopy={value} />
      </div>
    </div>
  );
};

export default TextareaWithCopy;
