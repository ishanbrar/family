-- Allow admins to remove any family member (claimed or unclaimed).
-- Confirmation is handled in the UI.

BEGIN;

DROP POLICY IF EXISTS "Admins can delete unclaimed family members" ON public.profiles;

CREATE POLICY "Admins can delete any family member"
  ON public.profiles
  FOR DELETE
  USING (
    public.is_admin_of_family(family_id)
  );

COMMIT;
