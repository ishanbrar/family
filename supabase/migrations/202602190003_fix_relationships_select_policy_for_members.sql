BEGIN;

-- Ensure non-admin family members can read relationship edges for their own family.
-- Without this, members can see profiles but zero connections, causing disconnected layouts.
DROP POLICY IF EXISTS "Family members can view relationships" ON public.relationships;

CREATE POLICY "Family members can view relationships"
  ON public.relationships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p_user
      JOIN public.profiles p_relative ON p_relative.id = public.relationships.relative_id
      WHERE p_user.id = public.relationships.user_id
        AND p_user.family_id = public.get_my_family_id()
        AND p_relative.family_id = p_user.family_id
    )
  );

COMMIT;
