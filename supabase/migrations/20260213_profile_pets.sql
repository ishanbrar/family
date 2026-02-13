-- Legacy: add pets field to profiles

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pets TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

UPDATE public.profiles
SET pets = '{}'::TEXT[]
WHERE pets IS NULL;

COMMIT;
