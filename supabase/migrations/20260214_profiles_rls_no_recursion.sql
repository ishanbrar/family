-- Fix: infinite recursion in RLS on profiles
-- Policies that SELECT from profiles while evaluating profiles RLS cause recursion.
-- Use SECURITY DEFINER helpers so the read runs without RLS.

BEGIN;

-- Returns the current user's family_id (bypasses RLS).
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Returns true if the current user is an ADMIN for the given family.
CREATE OR REPLACE FUNCTION public.is_admin_of_family(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'ADMIN' AND family_id = p_family_id
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_family_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_family_id() TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin_of_family(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_of_family(uuid) TO authenticated;

-- Replace profiles SELECT policy: use helper instead of subquery on profiles.
DROP POLICY IF EXISTS "Users can view family profiles" ON public.profiles;
CREATE POLICY "Users can view family profiles"
  ON public.profiles FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR family_id = public.get_my_family_id()
  );

-- Replace profiles UPDATE policies.
DROP POLICY IF EXISTS "Admins can update any family profile" ON public.profiles;
CREATE POLICY "Admins can update any family profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_of_family(family_id));

-- Replace profiles INSERT policy.
DROP POLICY IF EXISTS "Admins can insert family members" ON public.profiles;
CREATE POLICY "Admins can insert family members"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
    OR public.is_admin_of_family(family_id)
  );

COMMIT;
