-- ============================================
-- CryptoCrawler — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Create the protocols table
CREATE TABLE IF NOT EXISTS protocols (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  website    TEXT NOT NULL DEFAULT '404',
  twitter    TEXT NOT NULL DEFAULT '404',
  discord    TEXT NOT NULL DEFAULT '404',
  status     TEXT NOT NULL DEFAULT 'NOT_FOUND' CHECK (status IN ('FOUND', 'NOT_FOUND', 'PARTIAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on name for fast upserts
CREATE INDEX IF NOT EXISTS idx_protocols_name ON protocols (name);

-- Index on status for dashboard filtering
CREATE INDEX IF NOT EXISTS idx_protocols_status ON protocols (status);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_protocols_created_at ON protocols (created_at DESC);

-- ============================================
-- NOTE: No RLS needed for anon key with this simple setup.
-- If you want to enable RLS later:
-- ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon read" ON protocols FOR SELECT USING (true);
-- CREATE POLICY "Allow anon write" ON protocols FOR ALL USING (true);
-- ============================================
