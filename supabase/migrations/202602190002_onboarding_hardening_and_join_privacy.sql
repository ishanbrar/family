BEGIN;

-- Store deferred signup intent server-side (instead of local storage only).
CREATE TABLE IF NOT EXISTS public.pending_signup_intents (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('create', 'join')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text CHECK (gender IN ('female', 'male')),
  family_name text,
  invite_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  consumed_at timestamptz
);

DROP TRIGGER IF EXISTS pending_signup_intents_updated_at ON public.pending_signup_intents;
CREATE TRIGGER pending_signup_intents_updated_at
  BEFORE UPDATE ON public.pending_signup_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pending_signup_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct reads on pending intents" ON public.pending_signup_intents;
CREATE POLICY "No direct reads on pending intents"
  ON public.pending_signup_intents
  FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "No direct writes on pending intents" ON public.pending_signup_intents;
CREATE POLICY "No direct writes on pending intents"
  ON public.pending_signup_intents
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.upsert_pending_signup_intent(
  p_auth_user_id uuid,
  p_mode text,
  p_first_name text,
  p_last_name text,
  p_gender text DEFAULT NULL,
  p_family_name text DEFAULT NULL,
  p_invite_code text DEFAULT NULL
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
    auth_user_id, mode, first_name, last_name, gender, family_name, invite_code, consumed_at, expires_at
  )
  VALUES (
    p_auth_user_id,
    p_mode,
    COALESCE(NULLIF(TRIM(p_first_name), ''), 'Family'),
    COALESCE(NULLIF(TRIM(p_last_name), ''), 'Member'),
    CASE WHEN p_gender IN ('female', 'male') THEN p_gender ELSE NULL END,
    NULLIF(TRIM(p_family_name), ''),
    CASE WHEN p_invite_code IS NULL THEN NULL ELSE UPPER(TRIM(p_invite_code)) END,
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
      consumed_at = NULL,
      expires_at = EXCLUDED.expires_at,
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_pending_signup_intent(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_pending_signup_intent(uuid, text, text, text, text, text, text) TO anon, authenticated;

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
    'invite_code', v_row.invite_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_pending_signup_intent(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_pending_signup_intent(uuid) TO authenticated;

-- Privacy model: limited join preview before claim/join.
CREATE OR REPLACE FUNCTION public.get_join_family_preview(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  v_family_id := public.lookup_family_by_invite_code(p_invite_code);
  IF v_family_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'family_id', v_family_id,
    'family_name', (SELECT name FROM public.families WHERE id = v_family_id),
    'preview_limited', true,
    'members',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'first_name', CASE WHEN p.auth_user_id IS NULL THEN p.first_name ELSE 'Family' END,
              'last_name', CASE WHEN p.auth_user_id IS NULL THEN p.last_name ELSE 'Member' END,
              'gender', p.gender,
              'avatar_url', CASE WHEN p.auth_user_id IS NULL THEN p.avatar_url ELSE NULL END,
              'created_at', p.created_at,
              'is_claimable', (p.auth_user_id IS NULL)
            )
            ORDER BY p.created_at ASC
          )
          FROM public.profiles p
          WHERE p.family_id = v_family_id
        ),
        '[]'::jsonb
      ),
    'relationships', '[]'::jsonb
  );
END;
$$;

-- Claim flow: merge actor temp profile data into claimed node instead of deleting blindly.
CREATE OR REPLACE FUNCTION public.claim_family_member_node(
  p_invite_code text,
  p_target_profile_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  v_family_id uuid;
  v_actor_profile_id uuid;
  v_actor_family_id uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_family_id := public.lookup_family_by_invite_code(p_invite_code);
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_target_profile_id
      AND p.family_id = v_family_id
      AND p.auth_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Selected family node is not claimable';
  END IF;

  SELECT id, family_id
  INTO v_actor_profile_id, v_actor_family_id
  FROM public.profiles
  WHERE auth_user_id = actor
  LIMIT 1;

  IF v_actor_profile_id IS NULL THEN
    INSERT INTO public.profiles (id, auth_user_id, first_name, last_name, role)
    VALUES (actor, actor, 'Family', 'Member', 'MEMBER')
    RETURNING id INTO v_actor_profile_id;
    v_actor_family_id := NULL;
  END IF;

  IF v_actor_family_id IS NOT NULL AND v_actor_family_id <> v_family_id THEN
    RAISE EXCEPTION 'You already belong to another family';
  END IF;

  IF v_actor_profile_id <> p_target_profile_id THEN
    UPDATE public.profiles tgt
    SET display_name = COALESCE(tgt.display_name, src.display_name),
        gender = COALESCE(tgt.gender, src.gender),
        avatar_url = COALESCE(tgt.avatar_url, src.avatar_url),
        date_of_birth = COALESCE(tgt.date_of_birth, src.date_of_birth),
        place_of_birth = COALESCE(tgt.place_of_birth, src.place_of_birth),
        profession = COALESCE(tgt.profession, src.profession),
        location_city = COALESCE(tgt.location_city, src.location_city),
        location_lat = COALESCE(tgt.location_lat, src.location_lat),
        location_lng = COALESCE(tgt.location_lng, src.location_lng),
        pets = CASE WHEN COALESCE(array_length(tgt.pets, 1), 0) > 0 THEN tgt.pets ELSE src.pets END,
        social_links = CASE
          WHEN tgt.social_links IS NULL OR tgt.social_links = '{}'::jsonb THEN src.social_links
          ELSE tgt.social_links
        END,
        about_me = COALESCE(tgt.about_me, src.about_me),
        country_code = COALESCE(tgt.country_code, src.country_code)
    FROM public.profiles src
    WHERE tgt.id = p_target_profile_id
      AND src.id = v_actor_profile_id
      AND src.auth_user_id = actor
      AND src.family_id IS NULL;

    UPDATE public.relationships r
    SET user_id = p_target_profile_id
    WHERE r.user_id = v_actor_profile_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.relationships r2
        WHERE r2.user_id = p_target_profile_id
          AND r2.relative_id = r.relative_id
          AND r2.type = r.type
      );
    DELETE FROM public.relationships WHERE user_id = v_actor_profile_id;

    UPDATE public.relationships r
    SET relative_id = p_target_profile_id
    WHERE r.relative_id = v_actor_profile_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.relationships r2
        WHERE r2.user_id = r.user_id
          AND r2.relative_id = p_target_profile_id
          AND r2.type = r.type
      );
    DELETE FROM public.relationships WHERE relative_id = v_actor_profile_id;

    UPDATE public.user_conditions uc
    SET user_id = p_target_profile_id
    WHERE uc.user_id = v_actor_profile_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_conditions uc2
        WHERE uc2.user_id = p_target_profile_id
          AND uc2.condition_id = uc.condition_id
      );
    DELETE FROM public.user_conditions WHERE user_id = v_actor_profile_id;

    DELETE FROM public.profiles
    WHERE id = v_actor_profile_id
      AND auth_user_id = actor
      AND family_id IS NULL;
  END IF;

  UPDATE public.profiles
  SET auth_user_id = actor,
      role = 'MEMBER'
  WHERE id = p_target_profile_id
    AND family_id = v_family_id
    AND auth_user_id IS NULL;

  RETURN p_target_profile_id;
END;
$$;

COMMIT;
