-- Add Telugu relation label option.

ALTER TABLE public.families
  DROP CONSTRAINT IF EXISTS families_relation_language_check;

ALTER TABLE public.families
  ADD CONSTRAINT families_relation_language_check
  CHECK (relation_language IN ('en', 'punjabi', 'es', 'fr', 'telugu'));

COMMENT ON COLUMN public.families.relation_language IS
  'Language for relation labels in tree/profile: en (English), punjabi, es (Spanish), fr (French), telugu. Admin-only setting.';

CREATE OR REPLACE FUNCTION public.upsert_pending_signup_intent(
  p_auth_user_id uuid,
  p_mode text,
  p_first_name text,
  p_last_name text,
  p_gender text DEFAULT NULL,
  p_family_name text DEFAULT NULL,
  p_invite_code text DEFAULT NULL,
  p_relation_language text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_user_id required';
  END IF;
  IF p_mode NOT IN ('create', 'join') THEN
    RAISE EXCEPTION 'invalid pending signup mode';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_auth_user_id) THEN
    RAISE EXCEPTION 'auth user not found';
  END IF;

  INSERT INTO public.pending_signup_intents (
    auth_user_id,
    mode,
    first_name,
    last_name,
    gender,
    family_name,
    invite_code,
    relation_language,
    consumed_at,
    expires_at
  )
  VALUES (
    p_auth_user_id,
    p_mode,
    COALESCE(NULLIF(TRIM(p_first_name), ''), 'Family'),
    COALESCE(NULLIF(TRIM(p_last_name), ''), 'Member'),
    CASE WHEN p_gender IN ('female', 'male') THEN p_gender ELSE NULL END,
    NULLIF(TRIM(p_family_name), ''),
    CASE WHEN p_invite_code IS NULL THEN NULL ELSE UPPER(TRIM(p_invite_code)) END,
    CASE
      WHEN p_relation_language IN ('en', 'punjabi', 'es', 'fr', 'telugu') THEN p_relation_language
      ELSE NULL
    END,
    NULL,
    now() + interval '48 hours'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET mode = EXCLUDED.mode,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      gender = EXCLUDED.gender,
      family_name = EXCLUDED.family_name,
      invite_code = EXCLUDED.invite_code,
      relation_language = EXCLUDED.relation_language,
      consumed_at = NULL,
      expires_at = EXCLUDED.expires_at,
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_pending_signup_intent(uuid, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_pending_signup_intent(uuid, text, text, text, text, text, text, text) TO anon, authenticated;
