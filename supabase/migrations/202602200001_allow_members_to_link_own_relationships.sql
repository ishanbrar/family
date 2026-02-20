BEGIN;

-- Allow authenticated family members to add relationship edges that include themselves.
-- This supports post-join onboarding where a newly joined member links their node
-- to existing relatives (without requiring admin privileges).
DROP POLICY IF EXISTS "Members can link own relationships" ON public.relationships;

CREATE POLICY "Members can link own relationships"
  ON public.relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
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
