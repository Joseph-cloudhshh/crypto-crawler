'use client';
import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  disabled?: boolean;
}

export default function CopyButton({ text, disabled }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  if (disabled || !text || text === '404') {
    return (
      <span className="text-xs text-gray-600 font-mono">—</span>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors font-mono"
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  );
}
