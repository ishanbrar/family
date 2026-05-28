-- Anniversary / marriage date on spouse relationships.

BEGIN;

ALTER TABLE public.relationships
  ADD COLUMN IF NOT EXISTS marriage_date DATE;

COMMIT;
