"use client";

import { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton = ({ textToCopy }: CopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition duration-150 ease-in-out ${
        isCopied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export default CopyButton;
