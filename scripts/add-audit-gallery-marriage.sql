-- Run once in Supabase SQL editor.
-- Adds:
-- 1) profile gallery photos
-- 2) marriage/anniversary date on spouse relationships
-- 3) audit logs table + RLS policies

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gallery_photos TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS marriage_date DATE;

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name    TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  details       JSONB DEFAULT '{}'::JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_family_created
  ON audit_logs(family_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family can view audit logs" ON audit_logs;
CREATE POLICY "Family can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Family members can insert audit logs" ON audit_logs;
CREATE POLICY "Family members can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
  );
