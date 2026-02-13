-- Legacy: invite-code lookup RPC + profile membership guard rails
-- Fixes join-by-code under RLS and prevents cross-family reassignment.

BEGIN;

CREATE OR REPLACE FUNCTION public.lookup_family_by_invite_code(p_invite_code text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id
  FROM public.families f
  WHERE UPPER(f.invite_code) = UPPER(TRIM(p_invite_code))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.lookup_family_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_family_by_invite_code(text) TO authenticated;

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
  -- Allow trusted backend/admin SQL contexts.
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  -- Never allow auth identity reassignment via client updates.
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'auth_user_id is immutable';
  END IF;

  -- Family assignment can only happen once for the account owner.
  IF NEW.family_id IS DISTINCT FROM OLD.family_id THEN
    IF NOT (OLD.auth_user_id = actor AND OLD.family_id IS NULL) THEN
      RAISE EXCEPTION 'family assignment cannot be changed after setup';
    END IF;
  END IF;

  -- Role changes require admin privileges in the current family.
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

DROP TRIGGER IF EXISTS trg_guard_profile_membership_changes ON public.profiles;
CREATE TRIGGER trg_guard_profile_membership_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_membership_changes();

COMMIT;
