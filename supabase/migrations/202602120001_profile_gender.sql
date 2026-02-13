-- Legacy: add gender field to profiles

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;

UPDATE public.profiles
SET gender = NULL
WHERE gender IS NOT NULL
  AND gender NOT IN ('female', 'male');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IN ('female', 'male'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, auth_user_id, first_name, last_name, gender)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    CASE
      WHEN NEW.raw_user_meta_data->>'gender' IN ('female', 'male') THEN NEW.raw_user_meta_data->>'gender'
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
