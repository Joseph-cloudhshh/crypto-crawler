import { NextRequest, NextResponse } from 'next/server';
import { fetchDefiLlamaProtocols, searchDefiLlamaByName } from '../../lib/defillama';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    if (query) {
      const protocols = await searchDefiLlamaByName(query);
      return NextResponse.json({ protocols, count: protocols.length });
    }

    const all = await fetchDefiLlamaProtocols();
    const filtered = all.filter((p) => p.url && p.url.startsWith('http'));
    const protocols = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      protocols,
      count: protocols.length,
      total: filtered.length,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch protocols' }, { status: 500 });
  }
}