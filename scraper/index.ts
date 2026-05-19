import type { DefiLlamaProtocol } from '../app/lib/defillama';
import { normalizeUrl, normalizeTwitter } from '../app/lib/defillama';
import { crawlWebsite, crawlTwitter, resetVisited } from './utils/crawler';
import { upsertProtocol } from '../app/lib/supabase';
import { extractDiscordLinks, bestDiscordLink } from './extractors/discord';

export interface CrawlResult {
  protocol: string;
  website: string;
  twitter: string;
  discord: string;
  status: 'FOUND' | 'NOT_FOUND';
  rank?: number;
}

function deriveStatus(discord: string): CrawlResult['status'] {
  return discord && discord !== '404' ? 'FOUND' : 'NOT_FOUND';
}

async function fetchDefiLlamaDiscord(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${slug}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Direct discord field
    if (data.discord) return data.discord;
    // Check all link fields for discord URLs
    const allText = JSON.stringify(data);
    const links = extractDiscordLinks(allText);
    return bestDiscordLink(links);
  } catch {
    return null;
  }
}

export async function scrapeProtocol(proto: DefiLlamaProtocol, rank?: number): Promise<CrawlResult> {
  const website = normalizeUrl(proto.url);
  const twitter = normalizeTwitter(proto.twitter);
  const slug = proto.slug || proto.id;
  let discord = '404';

  // 1. Check DeFiLlama API first (fastest, most reliable)
  console.log(`[Scraper] Checking DeFiLlama API for ${proto.name}`);
  const llamaDiscord = await fetchDefiLlamaDiscord(slug);
  if (llamaDiscord) {
    discord = llamaDiscord;
    console.log(`[Scraper] ✓ Found via DeFiLlama API: ${discord}`);
  }

  // 2. Try crawling the website
  if (discord === '404' && website !== '404') {
    // Try root domain too, not just app subdomain
    const rootUrl = (() => {
      try {
        const u = new URL(website);
        if (u.hostname.startsWith('app.') || u.hostname.startsWith('www.')) {
          return `https://${u.hostname.replace(/^(app|www)\./, '')}`;
        }
      } catch {}
      return null;
    })();

    resetVisited();
    const found = await crawlWebsite(null, website);
    if (found) discord = found;

    if (discord === '404' && rootUrl && rootUrl !== website) {
      console.log(`[Scraper] Trying root domain: ${rootUrl}`);
      resetVisited();
      const found2 = await crawlWebsite(null, rootUrl);
      if (found2) discord = found2;
    }
  }

  // 3. Try Twitter as last resort
  if (discord === '404' && twitter !== '404') {
    const found = await crawlTwitter(null, twitter);
    if (found) discord = found;
  }

  const result: CrawlResult = {
    protocol: proto.name,
    website,
    twitter,
    discord,
    status: deriveStatus(discord),
    rank,
  };

  await upsertProtocol({
    name: result.protocol,
    discord: result.discord,
    status: result.status,
    rank: result.rank,
  });

  return result;
}

const PARALLEL = 3;
export async function scrapeProtocols(
  protocols: DefiLlamaProtocol[],
  onProgress?: (result: CrawlResult, index: number, total: number) => void,
  startRank = 1
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const total = protocols.length;
  for (let i = 0; i < total; i += PARALLEL) {
    const chunk = protocols.slice(i, i + PARALLEL);
    const chunkResults = await Promise.all(
      chunk.map(async (proto, j) => {
        const rank = startRank + i + j;
        const result = await scrapeProtocol(proto, rank);
        onProgress?.(result, i + j, total);
        return result;
      })
    );
    results.push(...chunkResults);
  }
  return results;
}
