import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rmpyubjiuzqrmdnwemum.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcHl1YmppdXpxcm1kbndlbXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjM4NTcsImV4cCI6MjA5NDQzOTg1N30.xJm4f3ry_MxingLdAEHsPDGhCohqu6z0XJNsRQriBmA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ProtocolRecord {
  id?: number;
  name: string;
  discord: string;
  status: 'FOUND' | 'NOT_FOUND';
  created_at?: string;
}

export async function upsertProtocol(record: Omit<ProtocolRecord, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('protocols')
    .upsert(
      {
        name: record.name,
        discord: record.discord,
        status: record.status,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'name' }
    )
    .select()
    .single();

  if (error) {
    console.error('[Supabase] upsert error:', error.message, error.details, error.hint);
    return null;
  }
  return data;
}

export async function fetchAllProtocols(): Promise<ProtocolRecord[]> {
  const { data, error } = await supabase
    .from('protocols')
    .select('id, name, discord, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] fetch error:', error.message);
    return [];
  }
  return data || [];
}

export async function fetchFoundOnly(): Promise<ProtocolRecord[]> {
  const { data, error } = await supabase
    .from('protocols')
    .select('id, name, discord, status, created_at')
    .eq('status', 'FOUND')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] fetch error:', error.message);
    return [];
  }
  return data || [];
}

export async function searchProtocols(query: string): Promise<ProtocolRecord[]> {
  const { data, error } = await supabase
    .from('protocols')
    .select('id, name, discord, status, created_at')
    .ilike('name', `%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] search error:', error.message);
    return [];
  }
  return data || [];
}