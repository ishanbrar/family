-- Legacy: auth + RLS safety fixes
-- Run this in Supabase SQL Editor, or via Supabase CLI migration flow.

BEGIN;

-- Required by families.invite_code default using gen_random_bytes(...)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Replace over-broad relationships admin policy with family-scoped rules.
DROP POLICY IF EXISTS "Admins can manage relationships" ON public.relationships;

CREATE POLICY "Admins can manage relationships"
  ON public.relationships
  FOR ALL
  USING (
    user_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.family_id IN (
        SELECT family_id
        FROM public.profiles
        WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
      )
    )
    AND relative_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.family_id IN (
        SELECT family_id
        FROM public.profiles
        WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
      )
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.family_id IN (
        SELECT family_id
        FROM public.profiles
        WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
      )
    )
    AND relative_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.family_id IN (
        SELECT family_id
        FROM public.profiles
        WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
      )
    )
  );

-- Ensure own-condition policy has WITH CHECK for INSERT/UPDATE safety.
DROP POLICY IF EXISTS "Users can manage own conditions" ON public.user_conditions;

CREATE POLICY "Users can manage own conditions"
  ON public.user_conditions
  FOR ALL
  USING (
    user_id IN (
      SELECT id
      FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id
      FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

COMMIT;
