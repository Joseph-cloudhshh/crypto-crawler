import type { Page } from 'puppeteer';
import { fetchPageHtml } from './browser';
import {
  extractDiscordFromHtml,
  extractLinktreeFromHtml,
  bestDiscordLink,
} from '../extractors/discord';

const MAX_DEPTH = 3;
const VISITED = new Set<string>();

const SUBPAGES = [
  '/community', '/social', '/links', '/discord',
  '/join', '/connect', '/about', '/team', '/contact'
];

export function resetVisited() {
  VISITED.clear();
}

export async function recursiveCrawl(
  page: Page | null,
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

export async function crawlWebsite(page: Page | null, websiteUrl: string): Promise<string | null> {
  resetVisited();

  // First try the main page
  const main = await recursiveCrawl(page, websiteUrl, 0);
  if (main) return main;

  // Then try common subpages
  try {
    const base = new URL(websiteUrl).origin;
    for (const subpage of SUBPAGES) {
      const subUrl = base + subpage;
      if (VISITED.has(subUrl)) continue;
      VISITED.add(subUrl);
      console.log(`[Crawler] Trying subpage: ${subUrl}`);
      const html = await fetchPageHtml(page, subUrl);
      if (!html) continue;
      const links = extractDiscordFromHtml(html);
      const best = bestDiscordLink(links);
      if (best) {
        console.log(`[Crawler] ✓ Discord found on subpage ${subpage}: ${best}`);
        return best;
      }
      // Also check linktree links on subpage
      const aggregatorLinks = extractLinktreeFromHtml(html);
      for (const link of aggregatorLinks) {
        if (VISITED.has(link)) continue;
        const found = await recursiveCrawl(page, link, 2);
        if (found) return found;
      }
    }
  } catch (e) {
    console.error('[Crawler] Subpage error:', e);
  }

  return null;
}

export async function crawlTwitter(page: Page | null, twitterUrl: string): Promise<string | null> {
  if (!twitterUrl || twitterUrl === '404') return null;
  return recursiveCrawl(page, twitterUrl, 0);
}
