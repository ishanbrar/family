-- Allow admins to remove unclaimed family-member nodes from the tree.
-- Claimed/auth-bound profiles remain protected.

BEGIN;

DROP POLICY IF EXISTS "Admins can delete unclaimed family members" ON public.profiles;

CREATE POLICY "Admins can delete unclaimed family members"
  ON public.profiles
  FOR DELETE
  USING (
    auth_user_id IS NULL
    AND public.is_admin_of_family(family_id)
  );

COMMIT;
