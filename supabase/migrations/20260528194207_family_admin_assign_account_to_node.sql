-- Family admin account-to-node assignment.
-- Moves a joined auth account from its current profile row onto an unclaimed
-- family-tree node while preserving relationships and health records.

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_profile_membership_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_is_admin boolean;
  admin_assignment_enabled boolean :=
    coalesce(current_setting('app.profile_admin_assignment', true), '') = 'on';
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    IF OLD.auth_user_id IS NULL AND NEW.auth_user_id = actor THEN
      RETURN NEW;
    END IF;

    IF admin_assignment_enabled
       AND public.is_admin_of_family(coalesce(OLD.family_id, NEW.family_id)) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'auth_user_id is immutable';
  END IF;

  IF NEW.family_id IS DISTINCT FROM OLD.family_id THEN
    IF NOT (OLD.auth_user_id = actor AND OLD.family_id IS NULL) THEN
      RAISE EXCEPTION 'family assignment cannot be changed after setup';
    END IF;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.auth_user_id = actor AND OLD.family_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = actor
        AND p.role = 'ADMIN'
        AND p.family_id = OLD.family_id
    ) INTO actor_is_admin;

    IF NOT actor_is_admin THEN
      RAISE EXCEPTION 'Only a family admin can change member roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_family_joined_user_to_node(
  p_source_profile_id uuid,
  p_target_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
  v_source public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_source_auth_user_id uuid;
BEGIN
  v_family_id := public.get_my_family_id();
  IF v_family_id IS NULL OR NOT public.is_admin_of_family(v_family_id) THEN
    RAISE EXCEPTION 'Family admin access required';
  END IF;

  IF p_source_profile_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Choose a different profile node.';
  END IF;

  SELECT * INTO v_source
  FROM public.profiles
  WHERE id = p_source_profile_id
    AND family_id = v_family_id
    AND auth_user_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Joined user not found';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_target_profile_id
    AND family_id = v_family_id
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

REVOKE ALL ON FUNCTION public.admin_assign_family_joined_user_to_node(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_family_joined_user_to_node(uuid, uuid) TO authenticated;

COMMIT;
