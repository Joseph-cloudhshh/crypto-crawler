import type { DefiLlamaProtocol } from '../app/lib/defillama';
import { normalizeUrl, normalizeTwitter } from '../app/lib/defillama';
import { getBrowser, newPage } from './utils/browser';
import { crawlWebsite, crawlTwitter, resetVisited } from './utils/crawler';
import { upsertProtocol } from '../app/lib/supabase';

export interface CrawlResult {
  protocol: string;
  website: string;
  twitter: string;
  discord: string;
  status: 'FOUND' | 'NOT_FOUND';
}

function deriveStatus(discord: string): CrawlResult['status'] {
  return discord && discord !== '404' ? 'FOUND' : 'NOT_FOUND';
}

export async function scrapeProtocol(proto: DefiLlamaProtocol): Promise<CrawlResult> {
  const website = normalizeUrl(proto.url);
  const twitter = normalizeTwitter(proto.twitter);

  let discord = '404';
  const browser = await getBrowser();
  const page = await newPage(browser);

  try {
    if (website !== '404') {
      resetVisited();
      const found = await crawlWebsite(page, website);
      if (found) discord = found;
    }

    if (discord === '404' && twitter !== '404') {
      const found = await crawlTwitter(page, twitter);
      if (found) discord = found;
    }
  } catch (err) {
    console.error(`[Scraper] Error scraping ${proto.name}:`, err);
  } finally {
    await page.close().catch(() => {});
  }

  const result: CrawlResult = {
    protocol: proto.name,
    website,
    twitter,
    discord,
    status: deriveStatus(discord),
  };

  // Only save to Supabase if Discord found
  if (result.discord !== '404') {
    await upsertProtocol({
      name: result.protocol,
      discord: result.discord,
      status: result.status,
    });
  }

  return result;
}

const PARALLEL = 3;

export async function scrapeProtocols(
  protocols: DefiLlamaProtocol[],
  onProgress?: (result: CrawlResult, index: number, total: number) => void
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const total = protocols.length;

  for (let i = 0; i < total; i += PARALLEL) {
    const chunk = protocols.slice(i, i + PARALLEL);
    const chunkResults = await Promise.all(
      chunk.map(async (proto, j) => {
        const result = await scrapeProtocol(proto);
        onProgress?.(result, i + j, total);
        return result;
      })
    );
    results.push(...chunkResults);
  }

  return results;
}