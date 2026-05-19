import * as cheerio from 'cheerio';

export async function fetchPageHtml(
  _page: any,
  url: string,
  _waitMs = 4000,
  _timeoutMs = 18000
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.warn(`[Browser] Failed to load ${url}:`, (err as Error).message);
    return null;
  }
}

export async function getBrowser(): Promise<any> { return {}; }
export async function closeBrowser(): Promise<void> {}
export async function newPage(_b: any): Promise<any> { return {}; }
