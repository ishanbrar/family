-- Family-level setting for relation labels language (e.g. Punjabi).
-- Future: add 'es', 'te', etc.
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS relation_language TEXT NOT NULL DEFAULT 'en'
  CHECK (relation_language IN ('en', 'punjabi'));

COMMENT ON COLUMN public.families.relation_language IS 'Language for relation labels in tree/profile: en (English), punjabi. Admin-only setting.';
