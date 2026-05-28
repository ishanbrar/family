-- Super-admin god mode.
-- Grants global family/tree/user management to an explicit email allowlist.

BEGIN;

CREATE TABLE IF NOT EXISTS public.super_admins (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email = lower(trim(email)) AND position('@' in email) > 1)
);

INSERT INTO public.super_admins (email)
VALUES
  ('ishanbrar@hotmail.com'),
  ('admin@sikhomode.com')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admins sa
    JOIN auth.users u ON lower(u.email) = sa.email
    WHERE u.id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

DROP POLICY IF EXISTS "Super admins can view super admins" ON public.super_admins;
CREATE POLICY "Super admins can view super admins"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can manage super admins" ON public.super_admins;
CREATE POLICY "Super admins can manage super admins"
  ON public.super_admins
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.is_admin_of_family(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN' AND family_id = p_family_id
    );
$$;

DROP POLICY IF EXISTS "Users can view family profiles" ON public.profiles;
CREATE POLICY "Users can view family profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR auth_user_id = auth.uid()
    OR family_id = public.get_my_family_id()
  );

DROP POLICY IF EXISTS "Admins can update any family profile" ON public.profiles;
CREATE POLICY "Admins can update any family profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_of_family(family_id))
  WITH CHECK (public.is_admin_of_family(family_id));

DROP POLICY IF EXISTS "Admins can insert family members" ON public.profiles;
CREATE POLICY "Admins can insert family members"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR public.is_admin_of_family(family_id)
  );

DROP POLICY IF EXISTS "Admins can delete any family member" ON public.profiles;
CREATE POLICY "Admins can delete any family member"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin_of_family(family_id));

DROP POLICY IF EXISTS "Members can view own family" ON public.families;
CREATE POLICY "Members can view own family"
  ON public.families FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR created_by = auth.uid()
    OR id = public.get_my_family_id()
  );

DROP POLICY IF EXISTS "Admins can update family" ON public.families;
CREATE POLICY "Admins can update family"
  ON public.families FOR UPDATE
  TO authenticated
  USING (public.is_admin_of_family(id))
  WITH CHECK (public.is_admin_of_family(id));

DROP POLICY IF EXISTS "Family members can view relationships" ON public.relationships;
CREATE POLICY "Family members can view relationships"
  ON public.relationships
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p_user
      JOIN public.profiles p_relative ON p_relative.id = public.relationships.relative_id
      WHERE p_user.id = public.relationships.user_id
        AND p_user.family_id = public.get_my_family_id()
        AND p_relative.family_id = p_user.family_id
    )
  );

DROP POLICY IF EXISTS "Admins can manage relationships" ON public.relationships;
CREATE POLICY "Admins can manage relationships"
  ON public.relationships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p_user
      JOIN public.profiles p_relative ON p_relative.id = public.relationships.relative_id
      WHERE p_user.id = public.relationships.user_id
        AND p_relative.family_id = p_user.family_id
        AND public.is_admin_of_family(p_user.family_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p_user
      JOIN public.profiles p_relative ON p_relative.id = public.relationships.relative_id
      WHERE p_user.id = public.relationships.user_id
        AND p_relative.family_id = p_user.family_id
        AND public.is_admin_of_family(p_user.family_id)
    )
  );

DROP POLICY IF EXISTS "Family can view conditions" ON public.user_conditions;
CREATE POLICY "Family can view conditions"
  ON public.user_conditions
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR user_id IN (
      SELECT id FROM public.profiles WHERE family_id = public.get_my_family_id()
    )
  );

DROP POLICY IF EXISTS "Users can manage own conditions" ON public.user_conditions;
CREATE POLICY "Users can manage own conditions"
  ON public.user_conditions
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_super_admin()
    OR user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Family can view audit logs" ON public.audit_logs;
CREATE POLICY "Family can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR family_id = public.get_my_family_id()
  );

DROP POLICY IF EXISTS "Family members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Family members can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR family_id = public.get_my_family_id()
  );

DROP POLICY IF EXISTS "Members can view family invite codes" ON public.family_invite_codes;
CREATE POLICY "Members can view family invite codes"
  ON public.family_invite_codes
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR family_id = public.get_my_family_id()
  );

DROP POLICY IF EXISTS "Admins can insert invite codes" ON public.family_invite_codes;
CREATE POLICY "Admins can insert invite codes"
  ON public.family_invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_of_family(family_id));

DROP POLICY IF EXISTS "Admins can update invite codes" ON public.family_invite_codes;
CREATE POLICY "Admins can update invite codes"
  ON public.family_invite_codes
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_of_family(family_id))
  WITH CHECK (public.is_admin_of_family(family_id));

DROP POLICY IF EXISTS "Admins can delete invite codes" ON public.family_invite_codes;
CREATE POLICY "Admins can delete invite codes"
  ON public.family_invite_codes
  FOR DELETE
  TO authenticated
  USING (public.is_admin_of_family(family_id));

CREATE OR REPLACE FUNCTION public.list_family_joined_users_for_family(p_family_id uuid)
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
  WHERE p.family_id = p_family_id
    AND public.is_admin_of_family(p.family_id)
    AND p.auth_user_id IS NOT NULL
  ORDER BY p.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_family_joined_user_for_family(
  p_family_id uuid,
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
  v_target public.profiles%ROWTYPE;
  v_admin_count integer;
  v_actor_profile_id uuid;
BEGIN
  IF p_family_id IS NULL OR NOT public.is_admin_of_family(p_family_id) THEN
    RAISE EXCEPTION 'Family admin access required';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_profile_id
    AND family_id = p_family_id
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
    WHERE family_id = p_family_id
      AND role = 'ADMIN'
      AND auth_user_id IS NOT NULL;

    IF v_actor_profile_id = p_profile_id
       AND v_target.role = 'ADMIN'
       AND p_role = 'MEMBER'
       AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'You cannot remove your own admin access.';
    END IF;

    IF v_target.role = 'ADMIN'
       AND p_role = 'MEMBER'
       AND v_admin_count <= 1
       AND NOT public.is_super_admin() THEN
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

CREATE OR REPLACE FUNCTION public.admin_remove_family_joined_user_for_family(
  p_family_id uuid,
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target public.profiles%ROWTYPE;
  v_admin_count integer;
  v_actor_profile_id uuid;
BEGIN
  IF p_family_id IS NULL OR NOT public.is_admin_of_family(p_family_id) THEN
    RAISE EXCEPTION 'Family admin access required';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_profile_id
    AND family_id = p_family_id
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
  WHERE family_id = p_family_id
    AND role = 'ADMIN'
    AND auth_user_id IS NOT NULL;

  IF v_actor_profile_id = p_profile_id AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'You cannot remove your own access.';
  END IF;

  IF v_target.role = 'ADMIN' AND v_admin_count <= 1 AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Add another admin before removing the last admin.';
  END IF;

  DELETE FROM auth.users WHERE id = v_target.auth_user_id;

  UPDATE public.profiles
  SET role = 'MEMBER'
  WHERE id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_family_joined_user_to_node_for_family(
  p_family_id uuid,
  p_source_profile_id uuid,
  p_target_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_source_auth_user_id uuid;
BEGIN
  IF p_family_id IS NULL OR NOT public.is_admin_of_family(p_family_id) THEN
    RAISE EXCEPTION 'Family admin access required';
  END IF;

  IF p_source_profile_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Choose a different profile node.';
  END IF;

  SELECT * INTO v_source
  FROM public.profiles
  WHERE id = p_source_profile_id
    AND family_id = p_family_id
    AND auth_user_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Joined user not found';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_target_profile_id
    AND family_id = p_family_id
    AND auth_user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected family node is not assignable';
  END IF;

  v_source_auth_user_id := v_source.auth_user_id;

  PERFORM set_config('app.profile_admin_assignment', 'on', true);

  UPDATE public.profiles
  SET auth_user_id = NULL,
      role = 'MEMBER'
  WHERE id = v_source.id;

  UPDATE public.profiles tgt
  SET auth_user_id = v_source_auth_user_id,
      role = v_source.role,
      display_name = COALESCE(tgt.display_name, v_source.display_name),
      gender = COALESCE(tgt.gender, v_source.gender),
      avatar_url = COALESCE(tgt.avatar_url, v_source.avatar_url),
      date_of_birth = COALESCE(tgt.date_of_birth, v_source.date_of_birth),
      date_of_death = COALESCE(tgt.date_of_death, v_source.date_of_death),
      place_of_birth = COALESCE(tgt.place_of_birth, v_source.place_of_birth),
      profession = COALESCE(tgt.profession, v_source.profession),
      location_city = COALESCE(tgt.location_city, v_source.location_city),
      secondary_location_city = COALESCE(tgt.secondary_location_city, v_source.secondary_location_city),
      address = COALESCE(tgt.address, v_source.address),
      location_lat = COALESCE(tgt.location_lat, v_source.location_lat),
      location_lng = COALESCE(tgt.location_lng, v_source.location_lng),
      map_location_source = COALESCE(tgt.map_location_source, v_source.map_location_source),
      pets = CASE
        WHEN COALESCE(array_length(tgt.pets, 1), 0) > 0 THEN tgt.pets
        ELSE v_source.pets
      END,
      social_links = CASE
        WHEN tgt.social_links IS NULL OR tgt.social_links = '{}'::jsonb THEN v_source.social_links
        ELSE tgt.social_links
      END,
      gallery_photos = CASE
        WHEN COALESCE(array_length(tgt.gallery_photos, 1), 0) > 0 THEN tgt.gallery_photos
        ELSE v_source.gallery_photos
      END,
      about_me = COALESCE(tgt.about_me, v_source.about_me),
      country_code = COALESCE(tgt.country_code, v_source.country_code),
      is_alive = COALESCE(tgt.is_alive, v_source.is_alive),
      onboarding_completed = tgt.onboarding_completed OR v_source.onboarding_completed
  WHERE tgt.id = v_target.id;

  DELETE FROM public.relationships
  WHERE (user_id = v_source.id AND relative_id = v_target.id)
     OR (user_id = v_target.id AND relative_id = v_source.id);

  UPDATE public.relationships r
  SET user_id = v_target.id
  WHERE r.user_id = v_source.id
    AND r.relative_id <> v_target.id
    AND NOT EXISTS (
      SELECT 1
      FROM public.relationships r2
      WHERE r2.user_id = v_target.id
        AND r2.relative_id = r.relative_id
        AND r2.type = r.type
    );
  DELETE FROM public.relationships WHERE user_id = v_source.id;

  UPDATE public.relationships r
  SET relative_id = v_target.id
  WHERE r.relative_id = v_source.id
    AND r.user_id <> v_target.id
    AND NOT EXISTS (
      SELECT 1
      FROM public.relationships r2
      WHERE r2.user_id = r.user_id
        AND r2.relative_id = v_target.id
        AND r2.type = r.type
    );
  DELETE FROM public.relationships WHERE relative_id = v_source.id;

  UPDATE public.user_conditions uc
  SET user_id = v_target.id
  WHERE uc.user_id = v_source.id
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_conditions uc2
      WHERE uc2.user_id = v_target.id
        AND uc2.condition_id = uc.condition_id
    );
  DELETE FROM public.user_conditions WHERE user_id = v_source.id;

  DELETE FROM public.profiles
  WHERE id = v_source.id
    AND auth_user_id IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.list_family_joined_users_for_family(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_family_joined_users_for_family(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_family_joined_user_for_family(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_family_joined_user_for_family(uuid, uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_remove_family_joined_user_for_family(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_family_joined_user_for_family(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_assign_family_joined_user_to_node_for_family(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_family_joined_user_to_node_for_family(uuid, uuid, uuid) TO authenticated;

COMMIT;
