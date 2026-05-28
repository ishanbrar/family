-- Family admin user management via SECURITY DEFINER RPCs.
-- Allows joined-user admin actions without a server-side service role key.

BEGIN;

CREATE OR REPLACE FUNCTION public.list_family_joined_users()
RETURNS TABLE (
  profile_id uuid,
  auth_user_id uuid,
  first_name text,
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
    p.first_name,
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

CREATE OR REPLACE FUNCTION public.admin_update_family_joined_user(
  p_profile_id uuid,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_family_id uuid;
  v_target public.profiles%ROWTYPE;
  v_admin_count integer;
  v_actor_profile_id uuid;
BEGIN
  v_family_id := public.get_my_family_id();
  IF v_family_id IS NULL OR NOT public.is_admin_of_family(v_family_id) THEN
    RAISE EXCEPTION 'Family admin access required';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_profile_id
    AND family_id = v_family_id
    AND auth_user_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Joined user not found';
  END IF;

  SELECT id INTO v_actor_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF p_role IS NOT NULL AND p_role IS DISTINCT FROM v_target.role THEN
    IF p_role NOT IN ('ADMIN', 'MEMBER') THEN
      RAISE EXCEPTION 'Invalid role';
    END IF;

    SELECT count(*) INTO v_admin_count
    FROM public.profiles
    WHERE family_id = v_family_id
      AND role = 'ADMIN'
      AND auth_user_id IS NOT NULL;

    IF v_actor_profile_id = p_profile_id
       AND v_target.role = 'ADMIN'
       AND p_role = 'MEMBER' THEN
      RAISE EXCEPTION 'You cannot remove your own admin access.';
    END IF;

    IF v_target.role = 'ADMIN'
       AND p_role = 'MEMBER'
       AND v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Add another admin before demoting the last admin.';
    END IF;
  END IF;

  IF p_email IS NOT NULL OR p_phone IS NOT NULL THEN
    IF p_email IS NOT NULL AND length(trim(p_email)) = 0 THEN
      RAISE EXCEPTION 'Email cannot be blank.';
    END IF;

    UPDATE auth.users u
    SET
      email = CASE WHEN p_email IS NOT NULL THEN trim(p_email) ELSE u.email END,
      raw_user_meta_data = CASE
        WHEN p_phone IS NOT NULL THEN
          CASE
            WHEN NULLIF(trim(p_phone), '') IS NULL THEN
              coalesce(u.raw_user_meta_data, '{}'::jsonb) - 'phone_number'
            ELSE
              coalesce(u.raw_user_meta_data, '{}'::jsonb)
                || jsonb_build_object('phone_number', trim(p_phone))
          END
        ELSE u.raw_user_meta_data
      END,
      phone = CASE
        WHEN p_phone IS NOT NULL AND trim(p_phone) ~ '^\+[1-9]\d{7,14}$' THEN trim(p_phone)
        WHEN p_phone IS NOT NULL THEN NULL
        ELSE u.phone
      END
    WHERE u.id = v_target.auth_user_id;
  END IF;

  UPDATE public.profiles p
  SET
    role = COALESCE(p_role, p.role),
    social_links = CASE
      WHEN p_phone IS NOT NULL THEN
        CASE
          WHEN NULLIF(trim(p_phone), '') IS NULL THEN coalesce(p.social_links, '{}'::jsonb) - 'phone_number'
          ELSE coalesce(p.social_links, '{}'::jsonb) || jsonb_build_object('phone_number', trim(p_phone))
        END
      ELSE p.social_links
    END
  WHERE p.id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_family_joined_user(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_family_id uuid;
  v_target public.profiles%ROWTYPE;
  v_admin_count integer;
  v_actor_profile_id uuid;
BEGIN
  v_family_id := public.get_my_family_id();
  IF v_family_id IS NULL OR NOT public.is_admin_of_family(v_family_id) THEN
    RAISE EXCEPTION 'Family admin access required';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_profile_id
    AND family_id = v_family_id
    AND auth_user_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Joined user not found';
  END IF;

  SELECT id INTO v_actor_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  SELECT count(*) INTO v_admin_count
  FROM public.profiles
  WHERE family_id = v_family_id
    AND role = 'ADMIN'
    AND auth_user_id IS NOT NULL;

  IF v_actor_profile_id = p_profile_id THEN
    RAISE EXCEPTION 'You cannot remove your own access.';
  END IF;

  IF v_target.role = 'ADMIN' AND v_admin_count <= 1 THEN
    RAISE EXCEPTION 'Add another admin before removing the last admin.';
  END IF;

  DELETE FROM auth.users WHERE id = v_target.auth_user_id;

  UPDATE public.profiles
  SET role = 'MEMBER'
  WHERE id = p_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_family_joined_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_family_joined_users() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_family_joined_user(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_family_joined_user(uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_remove_family_joined_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_family_joined_user(uuid) TO authenticated;

COMMIT;
