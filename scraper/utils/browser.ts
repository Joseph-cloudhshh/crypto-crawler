import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser;

  const token = process.env.BROWSERLESS_TOKEN;

  if (token) {
    // Use Browserless.io in production
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${token}`,
    });
  } else {
    // Fall back to local Chrome in Codespaces
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }

  browser.on('disconnected', () => { browser = null; });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) { await browser.close(); browser = null; }
}

export async function newPage(b: Browser): Promise<Page> {
  const page = await b.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  return page;
}

export async function fetchPageHtml(
  page: Page | null,
  url: string,
  waitMs = 3000,
  timeoutMs = 15000
): Promise<string | null> {
  // If no page (plain fetch mode), use fetch
  if (!page) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch (err) {
      console.warn(`[Browser] fetch failed ${url}:`, (err as Error).message);
      return null;
    }
  }
  // Use Puppeteer page
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    await new Promise(r => setTimeout(r, waitMs));
    return await page.content();
  } catch (err) {
    console.warn(`[Browser] Puppeteer failed ${url}:`, (err as Error).message);
    return null;
  }
}
