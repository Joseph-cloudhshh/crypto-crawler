export interface DefiLlamaProtocol {
  id: string;
  name: string;
  url: string;
  twitter?: string;
  slug: string;
  tvl?: number;
  category?: string;
}

const DEFILLAMA_API = 'https://api.llama.fi/protocols';

/**
 * Fetch all protocols from DefiLlama.
 */
export async function fetchDefiLlamaProtocols(): Promise<DefiLlamaProtocol[]> {
  try {
    const res = await fetch(DEFILLAMA_API, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CrawlerBot/1.0)' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`DefiLlama API error: ${res.status}`);
    const raw = await res.json();
    return raw as DefiLlamaProtocol[];
  } catch (err) {
    console.error('[DefiLlama] fetch error:', err);
    return [];
  }
}

/**
 * Get top N protocols by TVL.
 */
export async function getTopProtocols(limit = 20): Promise<DefiLlamaProtocol[]> {
  const all = await fetchDefiLlamaProtocols();
  return all
    .filter((p) => p.url && p.url.startsWith('http'))
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
    .slice(0, limit);
}

/**
 * Search protocols by name (fuzzy match).
 */
export async function searchDefiLlamaByName(query: string): Promise<DefiLlamaProtocol[]> {
  const all = await fetchDefiLlamaProtocols();
  const q = query.toLowerCase().trim();
  return all.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 10);
}

/**
 * Normalize a Twitter handle to a full URL.
 */
export function normalizeTwitter(handle?: string): string {
  if (!handle) return '404';
  if (handle.startsWith('http')) return handle;
  const clean = handle.replace(/^@/, '').trim();
  return clean ? `https://x.com/${clean}` : '404';
}

/**
 * Normalize a website URL.
 */
export function normalizeUrl(url?: string): string {
  if (!url || url === 'null' || url === 'undefined') return '404';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http')) return `https://${trimmed}`;
  return trimmed;
}
