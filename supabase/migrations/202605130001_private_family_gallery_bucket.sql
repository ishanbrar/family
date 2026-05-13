-- Private family gallery bucket with family-scoped read access.

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('family-gallery', 'family-gallery', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Family gallery read" ON storage.objects;
CREATE POLICY "Family gallery read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'family-gallery'
    AND EXISTS (
      SELECT 1
      FROM public.profiles viewer
      JOIN public.profiles target
        ON target.id::text = (storage.foldername(name))[2]
      WHERE viewer.auth_user_id = auth.uid()
        AND viewer.family_id IS NOT NULL
        AND viewer.family_id = target.family_id
    )
  );

DROP POLICY IF EXISTS "Family gallery upload" ON storage.objects;
CREATE POLICY "Family gallery upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'family-gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.profiles viewer
      JOIN public.profiles target
        ON target.id::text = (storage.foldername(name))[2]
      WHERE viewer.auth_user_id = auth.uid()
        AND viewer.family_id IS NOT NULL
        AND viewer.family_id = target.family_id
    )
  );

DROP POLICY IF EXISTS "Family gallery update" ON storage.objects;
CREATE POLICY "Family gallery update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'family-gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'family-gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Family gallery delete" ON storage.objects;
CREATE POLICY "Family gallery delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'family-gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
