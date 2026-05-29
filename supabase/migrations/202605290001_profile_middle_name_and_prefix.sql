ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name_prefix text,
  ADD COLUMN IF NOT EXISTS middle_name text;

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
              'name_prefix', CASE WHEN p.auth_user_id IS NULL THEN p.name_prefix ELSE NULL END,
              'first_name', CASE WHEN p.auth_user_id IS NULL THEN p.first_name ELSE 'Family' END,
              'middle_name', CASE WHEN p.auth_user_id IS NULL THEN p.middle_name ELSE NULL END,
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
    'relationships',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', r.id,
              'user_id', r.user_id,
              'relative_id', r.relative_id,
              'type', r.type,
              'created_at', r.created_at
            )
            ORDER BY r.created_at ASC
          )
          FROM public.relationships r
          WHERE r.user_id IN (SELECT id FROM public.profiles WHERE family_id = v_family_id)
            AND r.relative_id IN (SELECT id FROM public.profiles WHERE family_id = v_family_id)
        ),
        '[]'::jsonb
      )
  );
END;
$$;

DROP FUNCTION IF EXISTS public.list_family_joined_users();
CREATE FUNCTION public.list_family_joined_users()
RETURNS TABLE (
  profile_id uuid,
  auth_user_id uuid,
  name_prefix text,
  first_name text,
  middle_name text,
  last_name text,
  role text,
  social_links jsonb,
  created_at timestamptz,
  email text,
  phone text,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.id,
    p.auth_user_id,
    p.name_prefix,
    p.first_name,
    p.middle_name,
    p.last_name,
    p.role,
    p.social_links,
    p.created_at,
    u.email::text,
    COALESCE(
      NULLIF(trim(p.social_links->>'phone_number'), ''),
      NULLIF(trim(u.phone), ''),
      NULLIF(trim(u.raw_user_meta_data->>'phone_number'), '')
    ),
    u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE p.family_id = public.get_my_family_id()
    AND public.is_admin_of_family(p.family_id)
    AND p.auth_user_id IS NOT NULL
  ORDER BY p.created_at ASC;
$$;

DROP FUNCTION IF EXISTS public.list_family_joined_users_for_family(uuid);
CREATE FUNCTION public.list_family_joined_users_for_family(p_family_id uuid)
RETURNS TABLE (
  profile_id uuid,
  auth_user_id uuid,
  name_prefix text,
  first_name text,
  middle_name text,
  last_name text,
  role text,
  social_links jsonb,
  created_at timestamptz,
  email text,
  phone text,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.id,
    p.auth_user_id,
    p.name_prefix,
    p.first_name,
    p.middle_name,
    p.last_name,
    p.role,
    p.social_links,
    p.created_at,
    u.email::text,
    COALESCE(
      NULLIF(trim(p.social_links->>'phone_number'), ''),
      NULLIF(trim(u.phone), ''),
      NULLIF(trim(u.raw_user_meta_data->>'phone_number'), '')
    ),
    u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE p.family_id = p_family_id
    AND public.is_super_admin()
    AND p.auth_user_id IS NOT NULL
  ORDER BY p.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_family_joined_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_family_joined_users() TO authenticated;
REVOKE ALL ON FUNCTION public.list_family_joined_users_for_family(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_family_joined_users_for_family(uuid) TO authenticated;
