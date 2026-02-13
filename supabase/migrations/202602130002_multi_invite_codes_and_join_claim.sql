-- Legacy: multi invite codes + join preview + claim node flow

BEGIN;

CREATE TABLE IF NOT EXISTS public.family_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_invite_codes_format_check CHECK (code ~ '^[A-Z]{2,24}[0-9]{1,4}$')
);

CREATE INDEX IF NOT EXISTS idx_family_invite_codes_family_id
  ON public.family_invite_codes(family_id);

CREATE INDEX IF NOT EXISTS idx_family_invite_codes_is_active
  ON public.family_invite_codes(is_active);

DROP TRIGGER IF EXISTS family_invite_codes_updated_at ON public.family_invite_codes;
CREATE TRIGGER family_invite_codes_updated_at
  BEFORE UPDATE ON public.family_invite_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.family_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view family invite codes" ON public.family_invite_codes;
CREATE POLICY "Members can view family invite codes"
  ON public.family_invite_codes
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id
      FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert invite codes" ON public.family_invite_codes;
CREATE POLICY "Admins can insert invite codes"
  ON public.family_invite_codes
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id
      FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can update invite codes" ON public.family_invite_codes;
CREATE POLICY "Admins can update invite codes"
  ON public.family_invite_codes
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id
      FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id
      FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can delete invite codes" ON public.family_invite_codes;
CREATE POLICY "Admins can delete invite codes"
  ON public.family_invite_codes
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id
      FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE OR REPLACE FUNCTION public.family_invite_code_base(p_family_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
  base text;
  i integer;
  token text;
BEGIN
  parts := regexp_split_to_array(trim(COALESCE(p_family_name, '')), '\s+');
  base := '';

  IF array_length(parts, 1) IS NOT NULL THEN
    FOR i IN REVERSE array_lower(parts, 1)..array_upper(parts, 1) LOOP
      token := regexp_replace(upper(COALESCE(parts[i], '')), '[^A-Z]', '', 'g');
      IF token <> '' AND token <> 'FAMILY' THEN
        base := token;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF base = '' THEN
    base := regexp_replace(upper(COALESCE(parts[array_length(parts, 1)], '')), '[^A-Z]', '', 'g');
  END IF;

  IF base = '' OR length(base) < 2 THEN
    base := 'FAMILY';
  END IF;
  RETURN left(base, 24);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_family_invite_code(p_family_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
BEGIN
  base := family_invite_code_base(p_family_name);
  LOOP
    candidate := base || lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.family_invite_codes fic
      WHERE UPPER(fic.code) = UPPER(candidate)
    );
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_family_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_family_invite_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_family_invite_code_prefix()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_base text;
BEGIN
  NEW.code := UPPER(TRIM(NEW.code));
  SELECT public.family_invite_code_base(f.name)
  INTO expected_base
  FROM public.families f
  WHERE f.id = NEW.family_id;

  IF expected_base IS NULL THEN
    RAISE EXCEPTION 'Family not found for invite code';
  END IF;

  IF NEW.code !~ ('^' || expected_base || '[0-9]{1,4}$') THEN
    RAISE EXCEPTION 'Invite code must start with % and end with up to 4 digits', expected_base;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_family_invite_code_prefix ON public.family_invite_codes;
CREATE TRIGGER trg_validate_family_invite_code_prefix
  BEFORE INSERT OR UPDATE ON public.family_invite_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_family_invite_code_prefix();

CREATE OR REPLACE FUNCTION public.sync_primary_family_invite_code(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT fic.code
  INTO v_code
  FROM public.family_invite_codes fic
  WHERE fic.family_id = p_family_id
    AND fic.is_active = true
  ORDER BY fic.created_at DESC, fic.id DESC
  LIMIT 1;

  UPDATE public.families
  SET invite_code = v_code
  WHERE id = p_family_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_family_invite_code_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_primary_family_invite_code(COALESCE(NEW.family_id, OLD.family_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_family_invite_code_sync ON public.family_invite_codes;
CREATE TRIGGER trg_family_invite_code_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.family_invite_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_family_invite_code_sync();

CREATE OR REPLACE FUNCTION public.prevent_last_family_invite_code_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_active = true THEN
      SELECT count(*)
      INTO active_count
      FROM public.family_invite_codes fic
      WHERE fic.family_id = OLD.family_id
        AND fic.is_active = true;

      IF active_count <= 1 THEN
        RAISE EXCEPTION 'A family must always have at least one active invite code';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      SELECT count(*)
      INTO active_count
      FROM public.family_invite_codes fic
      WHERE fic.family_id = OLD.family_id
        AND fic.is_active = true;

      IF active_count <= 1 THEN
        RAISE EXCEPTION 'A family must always have at least one active invite code';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_family_invite_code_removal ON public.family_invite_codes;
CREATE TRIGGER trg_prevent_last_family_invite_code_removal
  BEFORE DELETE OR UPDATE ON public.family_invite_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_family_invite_code_removal();

CREATE OR REPLACE FUNCTION public.seed_default_family_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  v_code := public.generate_family_invite_code(NEW.name);
  INSERT INTO public.family_invite_codes (family_id, code, label, created_by)
  VALUES (NEW.id, v_code, 'Primary', NEW.created_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_family_invite_code ON public.families;
CREATE TRIGGER trg_seed_default_family_invite_code
  AFTER INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_family_invite_code();

INSERT INTO public.family_invite_codes (family_id, code, label, created_by)
SELECT
  f.id,
  public.generate_family_invite_code(f.name),
  'Primary',
  f.created_by
FROM public.families f
WHERE NOT EXISTS (
  SELECT 1
  FROM public.family_invite_codes fic
  WHERE fic.family_id = f.id
);

SELECT public.sync_primary_family_invite_code(f.id)
FROM public.families f;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id_unique
  ON public.profiles(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.lookup_family_by_invite_code(p_invite_code text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fic.family_id
  FROM public.family_invite_codes fic
  WHERE fic.is_active = true
    AND UPPER(fic.code) = UPPER(TRIM(p_invite_code))
  ORDER BY fic.created_at DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.lookup_family_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_family_by_invite_code(text) TO authenticated;

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
    'members',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'first_name', p.first_name,
              'last_name', p.last_name,
              'gender', p.gender,
              'avatar_url', p.avatar_url,
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

REVOKE ALL ON FUNCTION public.get_join_family_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_join_family_preview(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_family_as_new_node(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  v_family_id uuid;
  v_profile_id uuid;
  v_existing_family_id uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_family_id := public.lookup_family_by_invite_code(p_invite_code);
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT id, family_id
  INTO v_profile_id, v_existing_family_id
  FROM public.profiles
  WHERE auth_user_id = actor
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (id, auth_user_id, first_name, last_name, role, family_id)
    VALUES (actor, actor, 'Family', 'Member', 'MEMBER', v_family_id)
    RETURNING id INTO v_profile_id;
    RETURN v_profile_id;
  END IF;

  IF v_existing_family_id IS NOT NULL AND v_existing_family_id <> v_family_id THEN
    RAISE EXCEPTION 'You already belong to another family';
  END IF;

  IF v_existing_family_id IS NULL THEN
    UPDATE public.profiles
    SET family_id = v_family_id,
        role = 'MEMBER'
    WHERE id = v_profile_id;
  END IF;

  RETURN v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_family_as_new_node(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_family_as_new_node(text) TO authenticated;

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

REVOKE ALL ON FUNCTION public.claim_family_member_node(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_family_member_node(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_membership_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_is_admin boolean;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    IF NOT (OLD.auth_user_id IS NULL AND NEW.auth_user_id = actor) THEN
      RAISE EXCEPTION 'auth_user_id is immutable';
    END IF;
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

COMMIT;
