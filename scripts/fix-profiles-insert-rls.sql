-- Run this once in Supabase Dashboard → SQL Editor to fix "new row violates row-level security policy for table profiles".
-- It allows any family member (not only admins) to add new profiles to their family.

DROP POLICY IF EXISTS "Admins can insert family members" ON profiles;

CREATE POLICY "Admins can insert family members"
  ON profiles FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM profiles WHERE auth_user_id = auth.uid()
    )
    OR auth_user_id = auth.uid()
  );
