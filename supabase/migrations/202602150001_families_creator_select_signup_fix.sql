-- Fix signup family creation flow:
-- `insert(...).select("id")` needs SELECT visibility for the newly created row.
-- Allow creators to read their own family immediately, while preserving member-based access.

BEGIN;

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own family" ON public.families;
CREATE POLICY "Members can view own family"
  ON public.families
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT family_id
      FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families"
  ON public.families
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by IS NULL OR created_by = auth.uid())
  );

COMMIT;
