"use client";

import { useState, useEffect } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Optionally, provide user feedback about the error
    }
  };

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, 2000); // Reset after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  return (
    <button
      onClick={handleCopy}
      disabled={!textToCopy && !isCopied}
      style={{
        marginLeft: '8px',
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: isCopied ? '#4CAF50' : '#f0f0f0', // Green when copied, light gray otherwise
        color: isCopied ? 'white' : 'black',
        fontSize: '12px',
        minWidth: '70px', // Ensure button width is somewhat consistent
      }}
      title={isCopied ? "Copied!" : "Copy to clipboard"}
    >
      {isCopied ? 'Copied!' : '📋 Copy'}
    </button>
  );
};

export default CopyButton;
