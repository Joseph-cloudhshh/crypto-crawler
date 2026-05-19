'use client';

interface Stats {
  total: number;
  found: number;
  notFound: number;
}

export default function StatsBar({ stats }: { stats: Stats }) {
  const pct = stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="rounded-lg border border-gray-800 bg-surface p-4">
        <div className="text-2xl font-mono font-bold text-white">{stats.total}</div>
        <div className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-widest">Total Crawled</div>
      </div>
      <div className="rounded-lg border border-green-900/50 bg-green-900/10 p-4">
        <div className="text-2xl font-mono font-bold text-green-400">{stats.found}</div>
        <div className="text-xs text-green-700 mt-1 font-mono uppercase tracking-widest">Discord Found</div>
      </div>
      <div className="rounded-lg border border-red-900/50 bg-red-900/10 p-4">
        <div className="text-2xl font-mono font-bold text-red-400">{stats.notFound}</div>
        <div className="text-xs text-red-800 mt-1 font-mono uppercase tracking-widest">Not Found</div>
      </div>
    </div>
  );
}
