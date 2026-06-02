BEGIN;

ALTER TABLE public.pending_signup_intents
  ADD COLUMN IF NOT EXISTS relation_language text;

DROP FUNCTION IF EXISTS public.upsert_pending_signup_intent(uuid, text, text, text, text, text, text);

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
      WHEN p_relation_language IN ('en', 'punjabi', 'es', 'fr') THEN p_relation_language
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

CREATE OR REPLACE FUNCTION public.consume_pending_signup_intent(p_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.pending_signup_intents%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_auth_user_id THEN
    RAISE EXCEPTION 'unauthorized intent consume';
  END IF;

  SELECT *
  INTO v_row
  FROM public.pending_signup_intents psi
  WHERE psi.auth_user_id = p_auth_user_id
    AND psi.consumed_at IS NULL
    AND psi.expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.pending_signup_intents
  SET consumed_at = now(),
      updated_at = now()
  WHERE auth_user_id = p_auth_user_id;

  RETURN jsonb_build_object(
    'mode', v_row.mode,
    'first_name', v_row.first_name,
    'last_name', v_row.last_name,
    'gender', v_row.gender,
    'family_name', v_row.family_name,
    'invite_code', v_row.invite_code,
    'relation_language', v_row.relation_language
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_pending_signup_intent(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_pending_signup_intent(uuid) TO authenticated;

COMMIT;
