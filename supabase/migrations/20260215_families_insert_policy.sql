-- Ensure authenticated users can create a family (signup flow).
-- Fixes: "new row violates row-level security policy for table families"

BEGIN;

-- Remove any existing INSERT policy that might be missing or too strict.
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;

-- Allow insert when: user is authenticated and sets themselves as created_by (or created_by is null).
CREATE POLICY "Authenticated users can create families"
  ON public.families
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by IS NULL OR created_by = auth.uid())
  );

COMMIT;
