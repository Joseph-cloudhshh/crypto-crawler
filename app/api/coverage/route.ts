import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('protocols')
      .select('rank')
      .not('rank', 'is', null)
      .order('rank', { ascending: true });
    if (error) throw error;
    const crawled = (data || []).map((r: any) => r.rank).filter(Boolean);
    return NextResponse.json({ crawled, total: crawled.length });
  } catch (err) {
    console.error('[API /coverage] Error:', err);
    return NextResponse.json({ crawled: [], total: 0 }, { status: 500 });
  }
}
