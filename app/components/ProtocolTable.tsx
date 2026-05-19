'use client';
import StatusBadge from './StatusBadge';
import CopyButton from './CopyButton';

export interface ProtocolRow {
  protocol?: string;
  name?: string;
  website: string;
  twitter: string;
  discord: string;
  status: string;
  created_at?: string;
}

interface Props {
  rows: ProtocolRow[];
  onCrawl?: (name: string, website: string) => void;
  crawling?: string | null;
}

function truncate(str: string, n = 35) {
  if (!str || str === '404') return str;
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export default function ProtocolTable({ rows, onCrawl, crawling }: Props) {
  if (!rows.length) {
    return (
      <div className="text-center py-16 text-gray-500 font-mono text-sm">
        No results yet. Run a crawl above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Protocol</th>
            <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Website</th>
            <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Twitter</th>
            <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Discord</th>
            <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Status</th>
            <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const name = row.protocol || row.name || '—';
            const isCrawling = crawling === name;
            return (
              <tr
                key={i}
                className={`border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors ${isCrawling ? 'opacity-50' : ''}`}
              >
                <td className="py-3 px-4 font-mono font-semibold text-white">
                  {name}
                </td>
                <td className="py-3 px-4">
                  {row.website === '404' ? (
                    <span className="text-gray-600 font-mono text-xs">404</span>
                  ) : (
                    <a
                      href={row.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-mono text-xs"
                    >
                      {truncate(row.website)}
                    </a>
                  )}
                </td>
                <td className="py-3 px-4">
                  {row.twitter === '404' ? (
                    <span className="text-gray-600 font-mono text-xs">404</span>
                  ) : (
                    <a
                      href={row.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 font-mono text-xs"
                    >
                      {truncate(row.twitter, 25)}
                    </a>
                  )}
                </td>
                <td className="py-3 px-4">
                  {row.discord === '404' ? (
                    <span className="text-gray-600 font-mono text-xs">404</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <a
                        href={row.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 font-mono text-xs"
                      >
                        {truncate(row.discord, 28)}
                      </a>
                      <CopyButton text={row.discord} />
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="py-3 px-4">
                  {onCrawl && (
                    <button
                      onClick={() => onCrawl(name, row.website)}
                      disabled={!!crawling}
                      className="text-xs px-3 py-1 rounded border border-indigo-800 text-indigo-400 hover:bg-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
                    >
                      {isCrawling ? 'crawling…' : 're-crawl'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
