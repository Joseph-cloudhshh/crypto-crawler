'use client';
import { useState, useEffect, useCallback } from 'react';
import LogPanel from './components/LogPanel';
import StatsBar from './components/StatsBar';
import CoverageView from './components/CoverageView';

interface DefiLlamaProto {
  id: string;
  name: string;
  url: string;
  twitter?: string;
  tvl?: number;
}

interface CrawlRow {
  protocol: string;
  discord: string;
  status: 'FOUND' | 'NOT_FOUND';
}

interface SavedRow {
  id?: number;
  name: string;
  discord: string;
  status: string;
  created_at?: string;
}

function downloadTxt(rows: CrawlRow[]) {
  const found = rows.filter((r) => r.status === 'FOUND');
  const lines = found.map((r) => `${r.protocol} | ${r.discord}`).join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `discord-links-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [topLimit, setTopLimit] = useState(20);
  const [rangeFrom, setRangeFrom] = useState(0);
  const [rangeTo, setRangeTo] = useState(100);
  const [results, setResults] = useState<CrawlRow[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'crawl' | 'saved' | 'coverage'>('crawl');
  const [savedRecords, setSavedRecords] = useState<SavedRow[]>([]);
  const [savedSearch, setSavedSearch] = useState('');
  const [totalProtocols, setTotalProtocols] = useState(0);
  const [showFoundOnly, setShowFoundOnly] = useState(false);
  const [autoRounds, setAutoRounds] = useState(5);
  const [autoRunning, setAutoRunning] = useState(false);
  const [coverageData, setCoverageData] = useState<{crawled: number[], total: number}>({crawled: [], total: 0});

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadSaved = useCallback(async (q = '', foundOnly = false) => {
    try {
      let url = q ? `/api/results?q=${encodeURIComponent(q)}` : '/api/results';
      if (foundOnly) url += (url.includes('?') ? '&' : '?') + 'found=true';
      const res = await fetch(url);
      const data = await res.json();
      setSavedRecords(data.records ?? []);
    } catch (e) {
      console.error('Failed to load saved records', e);
      setSavedRecords([]);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'saved') loadSaved(savedSearch, showFoundOnly);
  }, [activeTab, loadSaved, savedSearch, showFoundOnly]);

  useEffect(() => {
    fetch('/api/protocols?limit=1')
      .then((r) => r.json())
      .then((d) => setTotalProtocols(d.total || 0))
      .catch(() => {});
  }, []);

  const loadCoverage = useCallback(async () => {
    try {
      const res = await fetch('/api/coverage');
      const data = await res.json();
      setCoverageData({ crawled: data.crawled ?? [], total: data.total ?? 0 });
    } catch (e) { console.error(e); setCoverageData({ crawled: [], total: 0 }); }
  }, []);

  const addResult = (data: CrawlRow) => {
    setResults((prev) => {
      const idx = prev.findIndex((r) => r.protocol === data.protocol);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = data;
        return updated;
      }
      return [...prev, data];
    });
  };

  const crawlSingle = async (name: string, website?: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setCrawling(name);
    setLogs([]);
    addLog(`Starting crawl for: ${name}`);
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url: website }),
      });
      const data = await res.json();
      if (data.error) {
        addLog(`✗ Error: ${data.error}`);
      } else {
        addLog(`✓ ${data.protocol}: ${data.discord}`);
        addResult({ protocol: data.protocol, discord: data.discord, status: data.status });

      }
    } catch (err) {
      addLog(`✗ Failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setCrawling(null);
    }
  };

  const crawlRange = async () => {
    setLoading(true);
    setLogs([]);
    setResults([]);
    const from = Math.max(0, rangeFrom);
    const to = Math.min(totalProtocols, rangeTo);
    const total = to - from;
    const batchSize = 20;
    addLog(`Crawling protocols ${from} to ${to} (${total} total)...`);
    addLog(`Est. time: ${Math.round((total * 15) / 60 / 3)}–${Math.round((total * 30) / 60 / 3)} min (3x parallel)`);
    let crawled = 0;
    const allResults: CrawlRow[] = [];

    // Load all crawled names upfront
    addLog('Loading already crawled protocols...');
    const crawledRes = await fetch('/api/results');
    const crawledData = await crawledRes.json();
    const crawledNames = new Set((crawledData.records || []).map((r: any) => r.name.toLowerCase()));
    addLog(`Loaded ${crawledNames.size} already crawled protocols`);

    for (let offset = from; offset < to; offset += batchSize) {
      const limit = Math.min(batchSize, to - offset);
      try {
        const res = await fetch(`/api/protocols?limit=${limit}&offset=${offset}`);
        const data = await res.json();
        const protocols: DefiLlamaProto[] = data.protocols || [];
        for (let i = 0; i < protocols.length; i++) {
          const proto = protocols[i];
          crawled++;
          // Skip already crawled
          if (crawledNames.has(proto.name.toLowerCase())) {
            addLog(`  ↩ Skipped: ${proto.name}`);
            continue;
          }
          addLog(`[${crawled}/${total}] ${proto.name}`);
          setCrawling(proto.name);
          try {
            const crawlRes = await fetch('/api/crawl', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: proto.name, url: proto.url, twitter: proto.twitter, rank: offset + i + 1 }),
            });
            const result = await crawlRes.json();
            if (!result.error) {
              const row: CrawlRow = { protocol: result.protocol, discord: result.discord, status: result.status };
              addLog(`  ${result.status === 'FOUND' ? '✓' : '✗'} ${result.protocol}: ${result.discord}`);
              addResult(row);
              allResults.push(row);
            }
          } catch (e) {
            addLog(`  ✗ ${(e as Error).message}`);
          }
        }
      } catch (e) {
        addLog(`✗ Batch failed: ${(e as Error).message}`);
      }
    }

    addLog(`✓ Done. ${allResults.filter(r => r.status === 'FOUND').length} Discord links found.`);
    setLoading(false);
    setCrawling(null);
  };

  const fetchAndCrawlTop = async () => {
    setLoading(true);
    setLogs([]);
    setResults([]);
    addLog(`Fetching top ${topLimit} protocols...`);
    const allResults: CrawlRow[] = [];
    try {
      const res = await fetch(`/api/protocols?limit=${topLimit}`);
      const data = await res.json();
      const protocols: DefiLlamaProto[] = data.protocols || [];
      addLog(`✓ Fetched ${protocols.length} protocols`);
      for (let i = 0; i < protocols.length; i++) {
        const proto = protocols[i];
        addLog(`[${i + 1}/${protocols.length}] ${proto.name}`);
        setCrawling(proto.name);
        try {
          const crawlRes = await fetch('/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: proto.name, url: proto.url, twitter: proto.twitter }),
          });
          const result = await crawlRes.json();
          if (!result.error) {
            const row: CrawlRow = { protocol: result.protocol, discord: result.discord, status: result.status };
            addLog(`  ${result.status === 'FOUND' ? '✓' : '✗'} ${result.protocol}: ${result.discord}`);
            addResult(row);
            allResults.push(row);
          }
        } catch (e) {
          addLog(`  ✗ ${(e as Error).message}`);
        }
      }
      addLog(`✓ Done.`);
    } catch (err) {
      addLog(`✗ Failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setCrawling(null);
    }
  };

  const batchRecrawl = async (names: string[]) => {
    setLoading(true);
    setLogs([]);
    addLog(`Batch re-crawling ${names.length} protocols...`);
    const allResults: CrawlRow[] = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      addLog(`[${i + 1}/${names.length}] ${name}`);
      setCrawling(name);
      try {
        const res = await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!data.error) {
          const row: CrawlRow = { protocol: data.protocol, discord: data.discord, status: data.status };
          addLog(`  ${data.status === 'FOUND' ? '✓' : '✗'} ${data.protocol}: ${data.discord}`);
          addResult(row);
          allResults.push(row);
        }
      } catch (e) {
        addLog(`  ✗ ${(e as Error).message}`);
      }
    }
    addLog(`✓ Batch complete.`);
    setLoading(false);
    setCrawling(null);
  };

  const autoCrawl = async () => {
    setAutoRunning(true);
    // Auto-detect start from highest crawled rank + 1
    let currentFrom = rangeFrom;
    try {
      const covRes = await fetch('/api/coverage');
      const covData = await covRes.json();
      if (covData.crawled && covData.crawled.length > 0) {
        const maxRank = Math.max(...covData.crawled);
        const autoStart = maxRank + 1;
        // Use whichever is higher - coverage max or user-set rangeFrom
        currentFrom = Math.max(autoStart, rangeFrom);
        addLog(`[Auto] Resuming from rank ${currentFrom}`);
      }
    } catch (e) {
      addLog(`[Auto] Could not detect last rank, using From value: ${currentFrom}`);
    }
    const crawledRes = await fetch('/api/results');
    const crawledData = await crawledRes.json();
    const crawledNamesSet = new Set((crawledData.records || []).map((r: any) => r.name.toLowerCase()));
    for (let round = 0; round < autoRounds; round++) {
      const currentTo = currentFrom + 25;
      setRangeFrom(currentFrom);
      setRangeTo(currentTo);
      addLog(`[Auto] Round ${round + 1}/${autoRounds}: ${currentFrom}-${currentTo}`);
      try {
        const res = await fetch(`/api/protocols?limit=25&offset=${currentFrom}`);
        const data = await res.json();
        const protocols: DefiLlamaProto[] = data.protocols || [];
        for (let i = 0; i < protocols.length; i++) {
          const proto = protocols[i];
          if (crawledNamesSet.has(proto.name.toLowerCase())) {
            addLog(`  ↩ Skipped: ${proto.name}`);
            continue;
          }
          setCrawling(proto.name);
          try {
            const crawlRes = await fetch('/api/crawl', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: proto.name, url: proto.url, twitter: proto.twitter, rank: currentFrom + i + 1 }),
            });
            const result = await crawlRes.json();
            if (!result.error) {
              const row: CrawlRow = { protocol: result.protocol, discord: result.discord, status: result.status };
              addLog(`  ${result.status === 'FOUND' ? '✓' : '✗'} ${result.protocol}: ${result.discord}`);
              addResult(row);
              crawledNamesSet.add(proto.name.toLowerCase());
            }
          } catch (e) {
            addLog(`  ✗ ${(e as Error).message}`);
          }
        }
      } catch (e) {
        addLog(`✗ Batch failed: ${(e as Error).message}`);
      }
      currentFrom = currentTo;
      await new Promise(r => setTimeout(r, 500));
    }
    setAutoRunning(false);
    setCrawling(null);
    setLoading(false);
    addLog(`[Auto] Done! Completed ${autoRounds} rounds of 25`);
  };

  const displayResults = showFoundOnly ? results.filter(r => r.status === 'FOUND') : results;
  const stats = {
    total: results.length,
    found: results.filter((r) => r.status === 'FOUND').length,
    notFound: results.filter((r) => r.status === 'NOT_FOUND').length,
  };
  const savedStats = {
    total: savedRecords.length,
    found: savedRecords.filter((r) => r.status === 'FOUND').length,
    notFound: savedRecords.filter((r) => r.status === 'NOT_FOUND').length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">C</div>
            <div>
              <h1 className="text-white font-semibold text-sm tracking-tight">CryptoCrawler</h1>
              <p className="text-gray-500 text-xs">Discord Discovery Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            {totalProtocols > 0 ? `${totalProtocols.toLocaleString()} protocols` : 'DefiLlama'}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="rounded-xl border border-gray-800 bg-[#111118] p-4 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-widest">Crawl Controls</h2>
          <div className="grid grid-cols-1 gap-3 mb-3">

            {/* Single */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Single Protocol</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && crawlSingle(searchInput)}
                  placeholder="e.g. Aave"
                  className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={() => crawlSingle(searchInput)}
                  disabled={loading || !searchInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Crawl
                </button>
              </div>
            </div>

            {/* Top N */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Top Protocols (by TVL)</label>
              <div className="flex gap-2">
                <select
                  value={topLimit}
                  onChange={(e) => setTopLimit(Number(e.target.value))}
                  className="bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>Top {n}</option>
                  ))}
                </select>
                <button
                  onClick={fetchAndCrawlTop}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors border border-gray-700"
                >
                  Fetch & Crawl
                </button>
              </div>
            </div>

            {/* Range */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">
                Crawl by Range {totalProtocols > 0 && <span className="text-indigo-400">(0–{totalProtocols})</span>}
              </label>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="number"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(Number(e.target.value))}
                  min={0}
                  max={totalProtocols}
                  className="w-24 bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="From"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="number"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(Number(e.target.value))}
                  min={0}
                  max={totalProtocols}
                  className="w-24 bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="To"
                />
                <button
                  onClick={crawlRange}
                  disabled={loading || rangeTo <= rangeFrom}
                  className="flex-1 px-4 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Crawl Range
                </button>
              </div>
              {rangeTo > rangeFrom && (
                <p className="text-xs text-gray-600 mt-1">
                  {rangeTo - rangeFrom} protocols — est. {Math.round(((rangeTo - rangeFrom) * 5) / 60)}–{Math.round(((rangeTo - rangeFrom) * 10) / 60)} min (3x parallel)
                </p>
              )}
            </div>

            {/* Auto Crawl */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Auto Crawl (25 each round)</label>
              <div className="flex gap-2 items-center">
                <select
                  value={autoRounds}
                  onChange={(e) => setAutoRounds(Number(e.target.value))}
                  className="bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {[2, 5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n} rounds ({n * 25} protocols)</option>
                  ))}
                </select>
                <button
                  onClick={autoCrawl}
                  disabled={loading || autoRunning}
                  className="flex-1 px-4 py-2 bg-green-800 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors border border-green-700"
                >
                  {autoRunning ? 'Auto Crawling...' : 'Start Auto Crawl'}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">Starts from current From value, advances 25 each round</p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-indigo-400 font-mono mb-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {crawling ? `Crawling: ${crawling}` : 'Processing...'}
            </div>
          )}

          <LogPanel logs={logs} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('crawl')}
            className={`px-4 py-2 text-sm font-mono transition-colors ${activeTab === 'crawl' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Session ({results.length})
          </button>
          <button
            onClick={() => { setActiveTab('saved'); loadSaved(savedSearch, showFoundOnly); }}
            className={`px-4 py-2 text-sm font-mono transition-colors ${activeTab === 'saved' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Saved ({savedRecords.length})
          </button>
          <button
            onClick={() => { setActiveTab('coverage'); loadCoverage(); }}
            className={`px-4 py-2 text-sm font-mono transition-colors ${activeTab === 'coverage' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Coverage
          </button>
        </div>

        {/* Session Tab */}
        {activeTab === 'crawl' && (
          <>
            {results.length > 0 && <StatsBar stats={stats} />}
            <div className="rounded-xl border border-gray-800 bg-[#111118]">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Results</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1 text-xs text-gray-400 font-mono cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFoundOnly}
                      onChange={(e) => setShowFoundOnly(e.target.checked)}
                      className="accent-indigo-500"
                    />
                    Found only
                  </label>
                  {results.length > 0 && (
                    <button
                      onClick={() => downloadTxt(results)}
                      className="text-xs px-3 py-1.5 rounded border border-green-800 text-green-400 hover:bg-green-900/30 transition-colors font-mono"
                    >
                      Download TXT
                    </button>
                  )}
                  {results.length > 0 && (
                    <button
                      onClick={() => {
                        const json = JSON.stringify(results, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'crawl-results.json';
                        a.click();
                      }}
                      className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors font-mono"
                    >
                      Export JSON
                    </button>
                  )}
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Protocol</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Discord</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Status</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResults.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-16 text-gray-500 font-mono text-sm">
                          No results yet. Run a crawl above.
                        </td>
                      </tr>
                    )}
                    {displayResults.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-800/50 hover:bg-white/[0.02] ${crawling === row.protocol ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-4 font-mono font-semibold text-white text-sm">{row.protocol}</td>
                        <td className="py-3 px-4">
                          {row.discord === '404' ? (
                            <span className="text-gray-600 font-mono text-xs">not found</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <a href={row.discord} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 font-mono text-xs">
                                {row.discord.length > 35 ? row.discord.slice(0, 35) + '…' : row.discord}
                              </a>
                              <button
                                onClick={() => navigator.clipboard.writeText(row.discord)}
                                className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors font-mono"
                              >
                                copy
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${row.status === 'FOUND' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'}`}>
                            {row.status === 'FOUND' ? '✓ FOUND' : '✗ NOT FOUND'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => crawlSingle(row.protocol)}
                            disabled={!!crawling}
                            className="text-xs px-3 py-1 rounded border border-indigo-800 text-indigo-400 hover:bg-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
                          >
                            {crawling === row.protocol ? 'crawling…' : 're-crawl'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <>
            {savedRecords.length > 0 && <StatsBar stats={savedStats} />}
            <div className="rounded-xl border border-gray-800 bg-[#111118]">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3 flex-wrap">
                <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Database</h2>
                <input
                  type="text"
                  value={savedSearch}
                  onChange={(e) => { setSavedSearch(e.target.value); loadSaved(e.target.value, showFoundOnly); }}
                  placeholder="Search..."
                  className="flex-1 max-w-xs bg-black/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <label className="flex items-center gap-1 text-xs text-gray-400 font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFoundOnly}
                    onChange={(e) => { setShowFoundOnly(e.target.checked); loadSaved(savedSearch, e.target.checked); }}
                    className="accent-indigo-500"
                  />
                  Found only
                </label>
                <button
                  onClick={() => loadSaved(savedSearch, showFoundOnly)}
                  className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors font-mono"
                >
                  Refresh
                </button>
                {savedRecords.length > 0 && (
                  <button
                    onClick={() => {
                      const found = savedRecords.filter(r => r.status === 'FOUND');
                      const lines = found.map(r => `${r.name} | ${r.discord}`).join('\n');
                      const blob = new Blob([lines], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `discord-links-db-${new Date().toISOString().slice(0, 10)}.txt`;
                      a.click();
                    }}
                    className="text-xs px-3 py-1.5 rounded border border-green-800 text-green-400 hover:bg-green-900/30 transition-colors font-mono"
                  >
                    Download TXT
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Protocol</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Discord</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Status</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-mono font-normal text-xs uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedRecords.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-16 text-gray-500 font-mono text-sm">
                          No records saved yet.
                        </td>
                      </tr>
                    )}
                    {savedRecords.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono font-semibold text-white text-sm">{row.name}</td>
                        <td className="py-3 px-4">
                          {row.discord === '404' ? (
                            <span className="text-gray-600 font-mono text-xs">not found</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <a href={row.discord} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 font-mono text-xs">
                                {row.discord.length > 35 ? row.discord.slice(0, 35) + '…' : row.discord}
                              </a>
                              <button
                                onClick={() => navigator.clipboard.writeText(row.discord)}
                                className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors font-mono"
                              >
                                copy
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${row.status === 'FOUND' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'}`}>
                            {row.status === 'FOUND' ? '✓ FOUND' : '✗ NOT FOUND'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => { crawlSingle(row.name); setActiveTab('crawl'); }}
                            disabled={!!crawling}
                            className="text-xs px-3 py-1 rounded border border-indigo-800 text-indigo-400 hover:bg-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
                          >
                            re-crawl
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      {activeTab === 'coverage' && (
        <div className="rounded-xl border border-gray-800 bg-[#111118] p-4">
          <h2 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-widest">Crawl Coverage</h2>
          {coverageData.crawled.length === 0 ? (
            <p className="text-gray-500 font-mono text-sm">No data yet. Click Coverage to load!</p>
          ) : (
            <>
              {(() => {
                const crawledSet = new Set(coverageData.crawled);
                const max = Math.max(...coverageData.crawled);
                let gapStart = null;
                for (let i = 1; i <= max + 1; i++) {
                  if (!crawledSet.has(i)) { gapStart = i; break; }
                }
                let lastConsecutive = 0;
                for (let i = 1; i <= max; i++) {
                  if (crawledSet.has(i)) lastConsecutive = i;
                  else break;
                }
                return (
                  <div className="mb-4 p-3 rounded-lg border border-indigo-800 bg-indigo-900/20">
                    <p className="text-xs text-indigo-400 font-mono uppercase tracking-widest mb-2">Resume Crawling</p>
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-mono">Crawled up to</p>
                        <p className="text-lg font-bold text-white font-mono">{lastConsecutive}</p>
                      </div>
                      {gapStart && (
                        <div>
                          <p className="text-xs text-gray-500 font-mono">Next gap starts at</p>
                          <p className="text-lg font-bold text-yellow-400 font-mono">{gapStart}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 font-mono">Continue from</p>
                        <p className="text-lg font-bold text-green-400 font-mono">{max + 1}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <CoverageView crawled={coverageData.crawled} />
            </>
          )}
        </div>
      )}
    </div>
  );
}