'use client';

interface Props {
  crawled: number[];
}

function toRanges(nums: number[]): string[] {
  if (!nums.length) return [];
  const sorted = [...nums].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (const n of sorted.slice(1)) {
    if (n === end + 1) {
      end = n;
    } else {
      ranges.push(start === end ? String(start) : start + '-' + end);
      start = end = n;
    }
  }
  ranges.push(start === end ? String(start) : start + '-' + end);
  return ranges;
}

export default function CoverageView({ crawled }: Props) {
  const crawledSet = new Set(crawled);
  const max = Math.max(...crawled);
  const missing: number[] = [];
  for (let i = 1; i <= max; i++) {
    if (!crawledSet.has(i)) missing.push(i);
  }
  const crawledRanges = toRanges(crawled);
  const missingRanges = toRanges(missing);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
          <div className="text-2xl font-bold text-green-400">{crawledSet.size}</div>
          <div className="text-xs text-gray-500 font-mono mt-1">Crawled</div>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
          <div className="text-2xl font-bold text-red-400">{missing.length}</div>
          <div className="text-xs text-gray-500 font-mono mt-1">Missing</div>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
          <div className="text-2xl font-bold text-indigo-400">{max}</div>
          <div className="text-xs text-gray-500 font-mono mt-1">Highest Rank</div>
        </div>
      </div>
      <div>
        <h3 className="text-xs text-green-400 font-mono uppercase tracking-widest mb-2">Crawled Ranges</h3>
        <div className="flex flex-wrap gap-2">
          {crawledRanges.map((r, i) => (
            <span key={i} className="px-2 py-1 bg-green-900/30 border border-green-800 text-green-400 text-xs font-mono rounded">{r}</span>
          ))}
        </div>
      </div>
      {missingRanges.length > 0 && (
        <div>
          <h3 className="text-xs text-red-400 font-mono uppercase tracking-widest mb-2">Missing Ranges</h3>
          <div className="flex flex-wrap gap-2">
            {missingRanges.map((r, i) => (
              <span key={i} className="px-2 py-1 bg-red-900/30 border border-red-800 text-red-400 text-xs font-mono rounded">{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
