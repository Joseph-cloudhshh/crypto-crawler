import type { Page } from 'puppeteer';
import { fetchPageHtml } from './browser';
import {
  extractDiscordFromHtml,
  extractLinktreeFromHtml,
  bestDiscordLink,
} from '../extractors/discord';

const MAX_DEPTH = 3;
const VISITED = new Set<string>();

/**
 * Reset the visited URL tracker between full crawl sessions.
 */
export function resetVisited() {
  VISITED.clear();
}

/**
 * Recursive crawler.
 * Visits a URL, extracts Discord links, then follows linktree-style links.
 * Returns the first Discord link found, or null.
 */
export async function recursiveCrawl(
  page: Page,
  url: string,
  depth = 0
): Promise<string | null> {
  if (depth > MAX_DEPTH) return null;
  if (VISITED.has(url)) return null;
  VISITED.add(url);

  console.log(`[Crawler] depth=${depth} url=${url}`);

  const html = await fetchPageHtml(page, url);
  if (!html) return null;

  // 1. Check for Discord links directly on this page
  const discordLinks = extractDiscordFromHtml(html);
  const best = bestDiscordLink(discordLinks);
  if (best) {
    console.log(`[Crawler] ✓ Discord found at depth=${depth}: ${best}`);
    return best;
  }

  // 2. Follow linktree / bio aggregator links recursively
  if (depth < MAX_DEPTH) {
    const aggregatorLinks = extractLinktreeFromHtml(html);
    for (const link of aggregatorLinks) {
      if (VISITED.has(link)) continue;
      const found = await recursiveCrawl(page, link, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Crawl a website URL for Discord. Entry point.
 */
export async function crawlWebsite(page: Page, websiteUrl: string): Promise<string | null> {
  resetVisited();
  return recursiveCrawl(page, websiteUrl, 0);
}

/**
 * Crawl a Twitter/X profile page for Discord or aggregator links.
 * Twitter aggressively blocks bots, so this is best-effort.
 */
export async function crawlTwitter(page: Page, twitterUrl: string): Promise<string | null> {
  if (!twitterUrl || twitterUrl === '404') return null;
  // Don't reset visited here — called after website crawl
  return recursiveCrawl(page, twitterUrl, 0);
}
