-- Run this once in Supabase Dashboard → SQL Editor.
-- Lets any signed-in family member (not only admins) add members, edit family profiles,
-- manage relationships, and delete unclaimed members. Fixes e.g. "millie mom b" showing
-- as Not Related because relationship INSERT was blocked for non-admins.

-- ── 1. Profiles: any family member can add members ──
DROP POLICY IF EXISTS "Admins can insert family members" ON profiles;
CREATE POLICY "Admins can insert family members"
  ON profiles FOR INSERT
  WITH CHECK (
    family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
    OR auth_user_id = auth.uid()
  );

-- ── 2. Profiles: any family member can update any profile in their family ──
DROP POLICY IF EXISTS "Admins can update any family profile" ON profiles;
CREATE POLICY "Family members can update family profiles"
  ON profiles FOR UPDATE
  USING (
    family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- ── 3. Profiles: any family member can delete unclaimed members in their family ──
DROP POLICY IF EXISTS "Admins can delete unclaimed family members" ON profiles;
CREATE POLICY "Family members can delete unclaimed family members"
  ON profiles FOR DELETE
  USING (
    auth_user_id IS NULL
    AND family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- ── 4. Relationships: any family member can insert/update/delete relationships in their family ──
DROP POLICY IF EXISTS "Admins can manage relationships" ON relationships;
CREATE POLICY "Family members can manage relationships"
  ON relationships FOR ALL
  USING (
    user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
    )
    AND relative_id IN (
      SELECT p.id FROM profiles p
      WHERE p.family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
    )
    AND relative_id IN (
      SELECT p.id FROM profiles p
      WHERE p.family_id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
    )
  );
