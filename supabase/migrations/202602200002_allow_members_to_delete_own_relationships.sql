BEGIN;

-- Allow authenticated family members to remove relationship edges that include themselves.
-- This enables self-service relationship edits in onboarding/manage relationship UI.
DROP POLICY IF EXISTS "Members can delete own relationships" ON public.relationships;

CREATE POLICY "Members can delete own relationships"
  ON public.relationships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p_me
      WHERE p_me.auth_user_id = auth.uid()
        AND p_me.family_id = public.get_my_family_id()
        AND (
          p_me.id = public.relationships.user_id
          OR p_me.id = public.relationships.relative_id
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles p_user
      WHERE p_user.id = public.relationships.user_id
        AND p_user.family_id = public.get_my_family_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles p_relative
      WHERE p_relative.id = public.relationships.relative_id
        AND p_relative.family_id = public.get_my_family_id()
    )
  );

COMMIT;
