import * as cheerio from 'cheerio';

const DISCORD_PATTERNS = [
  /https?:\/\/discord\.gg\/[A-Za-z0-9-]+/gi,
  /https?:\/\/discord\.com\/invite\/[A-Za-z0-9-]+/gi,
  /https?:\/\/discordapp\.com\/invite\/[A-Za-z0-9-]+/gi,
  /discord\.gg\/[A-Za-z0-9-]+/gi,
  /discord\.com\/invite\/[A-Za-z0-9-]+/gi,
];

export const LINKTREE_PATTERNS = [
  /https?:\/\/linktr\.ee\/[A-Za-z0-9_.-]+/gi,
  /https?:\/\/beacons\.ai\/[A-Za-z0-9_.-]+/gi,
  /https?:\/\/campsite\.bio\/[A-Za-z0-9_.-]+/gi,
  /https?:\/\/solo\.to\/[A-Za-z0-9_.-]+/gi,
  /https?:\/\/bio\.link\/[A-Za-z0-9_.-]+/gi,
  /https?:\/\/allmylinks\.com\/[A-Za-z0-9_.-]+/gi,
  /linktr\.ee\/[A-Za-z0-9_.-]+/gi,
  /beacons\.ai\/[A-Za-z0-9_.-]+/gi,
  /campsite\.bio\/[A-Za-z0-9_.-]+/gi,
  /solo\.to\/[A-Za-z0-9_.-]+/gi,
];

export function extractDiscordLinks(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];

  let decoded = text;
  try { decoded = decodeURIComponent(text); } catch { }

  // Handle markdown format [text](url)
  const markdownPattern = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi;
  for (const match of decoded.matchAll(markdownPattern)) {
    const url = match[2];
    if (url && (url.includes('discord.gg') || url.includes('discord.com/invite'))) {
      found.push(url.trim().replace(/[),\s'"]+$/, ''));
    }
  }

  for (const pattern of DISCORD_PATTERNS) {
    for (const match of decoded.matchAll(pattern)) {
      let link = match[0].trim().replace(/[),\s'"]+$/, '');
      if (!link.startsWith('http')) link = `https://${link}`;
      found.push(link);
    }
  }

  return [...new Set(found)];
}

export function extractLinktreeLinks(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const pattern of LINKTREE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      let link = match[0].trim().replace(/[),\s'"]+$/, '');
      if (!link.startsWith('http')) link = `https://${link}`;
      found.push(link);
    }
  }
  return [...new Set(found)];
}

interface ScoredLink {
  url: string;
  score: number;
}

/**
 * Smart extraction — scores Discord links by where they were found.
 * Footer/nav links score highest, random script content scores lowest.
 */
export function extractDiscordFromHtml(html: string): string[] {
  if (!html) return [];
  const $ = cheerio.load(html);
  const scored: ScoredLink[] = [];

  // Score 100 — footer links (most trusted)
  $('footer, [class*="footer"], [id*="footer"]').find('[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const link of extractDiscordLinks(href)) {
      scored.push({ url: link, score: 100 });
    }
  });

  // Score 90 — nav/header links
  $('nav, header, [class*="nav"], [class*="header"], [class*="menu"]').find('[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const link of extractDiscordLinks(href)) {
      scored.push({ url: link, score: 90 });
    }
  });

  // Score 80 — community/social sections
  $('[class*="community"], [class*="social"], [class*="links"], [id*="community"], [id*="social"]').find('[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const link of extractDiscordLinks(href)) {
      scored.push({ url: link, score: 80 });
    }
  });

  // Score 70 — all other href links
  $('[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const link of extractDiscordLinks(href)) {
      scored.push({ url: link, score: 70 });
    }
  });

  // Score 50 — data attributes
  $('*').each((_, el) => {
    const attribs = (el as unknown as { attribs?: Record<string, string> }).attribs || {};
    for (const val of Object.values(attribs)) {
      for (const link of extractDiscordLinks(String(val))) {
        scored.push({ url: link, score: 50 });
      }
    }
  });

  // Score 40 — visible text
  $('body').find('*').each((_, el) => {
    const text = $(el).text() || '';
    for (const link of extractDiscordLinks(text)) {
      scored.push({ url: link, score: 40 });
    }
  });

  // Score 20 — raw script content (least trusted)
  $('script').each((_, el) => {
    const content = $(el).html() || '';
    for (const link of extractDiscordLinks(content)) {
      scored.push({ url: link, score: 20 });
    }
  });

  // Score 10 — raw HTML fallback
  for (const link of extractDiscordLinks(html)) {
    scored.push({ url: link, score: 10 });
  }

  if (!scored.length) return [];

  // Group by URL and take highest score
  const best = new Map<string, number>();
  for (const { url, score } of scored) {
    best.set(url, Math.max(best.get(url) || 0, score));
  }

  // Sort by score descending
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([url]) => url);
}

export function extractLinktreeFromHtml(html: string): string[] {
  if (!html) return [];
  const $ = cheerio.load(html);
  const collected: string[] = [];

  $('[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    collected.push(...extractLinktreeLinks(href));
  });

  collected.push(...extractLinktreeLinks(html));
  return [...new Set(collected)];
}

export function bestDiscordLink(links: string[]): string | null {
  if (!links.length) return null;
  // Prefer discord.gg short links
  const short = links.find((l) => l.includes('discord.gg/'));
  return short || links[0];
}