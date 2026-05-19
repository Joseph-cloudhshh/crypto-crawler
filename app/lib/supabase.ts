import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rmpyubjiuzqrmdnwemum.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcHl1YmppdXpxcm1kbndlbXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjM4NTcsImV4cCI6MjA5NDQzOTg1N30.xJm4f3ry_MxingLdAEHsPDGhCohqu6z0XJNsRQriBmA';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  global: {
    headers: { 'Accept-Profile': 'public', 'Prefer': 'count=exact' }
  }
});
export interface ProtocolRecord {
  id?: number;
  name: string;
  discord: string;
  status: 'FOUND' | 'NOT_FOUND';
  rank?: number;
  crawled_at?: string;
  created_at?: string;
}
export async function upsertProtocol(record: Omit<ProtocolRecord, 'id' | 'created_at'>) {
  const now = new Date().toISOString();
  // Try update first
  const { data: existing } = await supabase
    .from('protocols')
    .select('id')
    .eq('name', record.name)
    .maybeSingle();
  if (existing) {
    const { data, error } = await supabase
      .from('protocols')
      .update({
        discord: record.discord,
        status: record.status,
        rank: record.rank ?? null,
        crawled_at: now,
      })
      .eq('name', record.name)
      .select()
      .single();
    if (error) console.error('[Supabase] update error:', error.message);
    return data;
  }
  // Insert new
  const { data, error } = await supabase
    .from('protocols')
    .insert({
      name: record.name,
      discord: record.discord,
      status: record.status,
      rank: record.rank ?? null,
      crawled_at: now,
      created_at: now,
    })
    .select()
    .single();
  if (error) console.error('[Supabase] insert error:', error.message);
  return data;
}
async function fetchWithPagination(query: any): Promise<any[]> {
  const pageSize = 1000;
  let page = 0;
  let allData: any[] = [];
  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await query.range(from, to);
    if (error) {
      console.error('[Supabase] pagination error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    page++;
    if (allData.length >= 5000) break;
  }
  return allData;
}
export async function fetchAllProtocols(): Promise<ProtocolRecord[]> {
  const query = supabase
    .from('protocols')
    .select('id, name, discord, status, rank, crawled_at, created_at')
    .order('rank', { ascending: true, nullsFirst: false });
  return fetchWithPagination(query);
}
export async function fetchFoundOnly(): Promise<ProtocolRecord[]> {
  const query = supabase
    .from('protocols')
    .select('id, name, discord, status, rank, crawled_at, created_at')
    .eq('status', 'FOUND')
    .order('rank', { ascending: true, nullsFirst: false });
  return fetchWithPagination(query);
}
export async function searchProtocols(query: string): Promise<ProtocolRecord[]> {
  const { data, error } = await supabase
    .from('protocols')
    .select('id, name, discord, status, rank, crawled_at, created_at')
    .ilike('name', `%${query}%`)
    .order('rank', { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) {
    console.error('[Supabase] search error:', error.message);
    return [];
  }
  return data || [];
}
