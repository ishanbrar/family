-- Allow family admins to rename their family.
-- Supports tree-name editing from the dedicated /tree page.

BEGIN;

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update family" ON public.families;
CREATE POLICY "Admins can update family"
  ON public.families
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT p.family_id
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role = 'ADMIN'
    )
  )
  WITH CHECK (
    id IN (
      SELECT p.family_id
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role = 'ADMIN'
    )
  );

COMMIT;
