import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser;

  browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,800',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--lang=en-US,en',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  browser.on('disconnected', () => {
    browser = null;
  });

  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function newPage(b: Browser): Promise<Page> {
  const page = await b.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  });

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'font', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  return page;
}

export async function fetchPageHtml(
  page: Page,
  url: string,
  waitMs = 4000,
  timeoutMs = 18000
): Promise<string | null> {
  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: timeoutMs,
    });

    await new Promise((r) => setTimeout(r, waitMs));

    const mainHtml = await page.content();

    const iframeTexts: string[] = [];
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const frameUrl = frame.url();
        if (frameUrl && frameUrl !== 'about:blank') {
          const frameHtml = await frame.content();
          iframeTexts.push(frameHtml);
        }
      } catch {
        // ignore
      }
    }

    return mainHtml + '\n' + iframeTexts.join('\n');
  } catch (err) {
    console.warn(`[Browser] Failed to load ${url}:`, (err as Error).message);
    return null;
  }
}