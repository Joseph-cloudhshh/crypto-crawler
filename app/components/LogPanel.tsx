'use client';
import { useEffect, useRef } from 'react';

interface LogPanelProps {
  logs: string[];
}

export default function LogPanel({ logs }: LogPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs]);

  if (!logs.length) return null;

  return (
    <div className="mt-6 rounded-lg border border-gray-800 bg-black/40">
      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Crawl Log</span>
      </div>
      <div
        ref={ref}
        className="p-4 font-mono text-xs text-gray-400 max-h-48 overflow-y-auto space-y-1"
      >
        {logs.map((log, i) => (
          <div key={i} className="leading-relaxed">
            <span className="text-gray-600 mr-2">{String(i + 1).padStart(3, '0')}</span>
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
