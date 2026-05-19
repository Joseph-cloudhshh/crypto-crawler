import { NextRequest, NextResponse } from 'next/server';
import { scrapeProtocol } from '../../../scraper/index';
import { normalizeUrl, normalizeTwitter, searchDefiLlamaByName } from '../../lib/defillama';
import type { DefiLlamaProtocol } from '../../lib/defillama';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, twitter } = body;

    if (!name) {
      return NextResponse.json({ error: 'Protocol name is required' }, { status: 400 });
    }

    let proto: DefiLlamaProtocol;

    // If URL provided directly, use it; otherwise look up in DefiLlama
    if (url) {
      proto = {
        id: name.toLowerCase(),
        name,
        url: normalizeUrl(url),
        twitter: twitter || '',
        slug: name.toLowerCase(),
      };
    } else {
      // Try to find in DefiLlama
      const matches = await searchDefiLlamaByName(name);
      if (matches.length > 0) {
        proto = matches[0];
      } else {
        // Create minimal protocol record
        proto = {
          id: name.toLowerCase(),
          name,
          url: '404',
          twitter: twitter || '',
          slug: name.toLowerCase(),
        };
      }
    }

    const result = await scrapeProtocol(proto);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API /crawl] Error:', err);
    return NextResponse.json(
      { error: 'Crawl failed', detail: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Crawl multiple protocols (batch).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '5', 10);

  try {
    const { getTopProtocols } = await import('../../lib/defillama');
    const { scrapeProtocols } = await import('../../../scraper/index');

    const protocols = await getTopProtocols(Math.min(limit, 20));
    const results = await scrapeProtocols(protocols);

    return NextResponse.json({ results, count: results.length });
  } catch (err) {
    console.error('[API /crawl GET] Error:', err);
    return NextResponse.json({ error: 'Batch crawl failed' }, { status: 500 });
  }
}
