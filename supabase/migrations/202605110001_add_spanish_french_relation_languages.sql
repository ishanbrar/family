-- Add Spanish and French relation label options.

ALTER TABLE public.families
  DROP CONSTRAINT IF EXISTS families_relation_language_check;

ALTER TABLE public.families
  ADD CONSTRAINT families_relation_language_check
  CHECK (relation_language IN ('en', 'punjabi', 'es', 'fr'));

COMMENT ON COLUMN public.families.relation_language IS
  'Language for relation labels in tree/profile: en (English), punjabi, es (Spanish), fr (French). Admin-only setting.';
