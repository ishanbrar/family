-- Legacy: add display_name (nickname) to profiles

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

COMMIT;
