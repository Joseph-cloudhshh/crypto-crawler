import { NextRequest, NextResponse } from 'next/server';
import { fetchAllProtocols, fetchFoundOnly, searchProtocols } from '../../lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const foundOnly = searchParams.get('found') === 'true';

  try {
    let records;
    if (query) {
      records = await searchProtocols(query);
    } else if (foundOnly) {
      records = await fetchFoundOnly();
    } else {
      records = await fetchAllProtocols();
    }
    return NextResponse.json({ records, count: records.length });
  } catch (err) {
    console.error('[API /results] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}