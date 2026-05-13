CREATE OR REPLACE FUNCTION public.get_join_family_preview(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  v_family_id := public.lookup_family_by_invite_code(p_invite_code);
  IF v_family_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'family_id', v_family_id,
    'family_name', (SELECT name FROM public.families WHERE id = v_family_id),
    'preview_limited', true,
    'members',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'first_name', CASE WHEN p.auth_user_id IS NULL THEN p.first_name ELSE 'Family' END,
              'last_name', CASE WHEN p.auth_user_id IS NULL THEN p.last_name ELSE 'Member' END,
              'gender', p.gender,
              'avatar_url', CASE WHEN p.auth_user_id IS NULL THEN p.avatar_url ELSE NULL END,
              'created_at', p.created_at,
              'is_claimable', (p.auth_user_id IS NULL)
            )
            ORDER BY p.created_at ASC
          )
          FROM public.profiles p
          WHERE p.family_id = v_family_id
        ),
        '[]'::jsonb
      ),
    'relationships',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', r.id,
              'user_id', r.user_id,
              'relative_id', r.relative_id,
              'type', r.type,
              'created_at', r.created_at
            )
            ORDER BY r.created_at ASC
          )
          FROM public.relationships r
          WHERE r.user_id IN (SELECT id FROM public.profiles WHERE family_id = v_family_id)
            AND r.relative_id IN (SELECT id FROM public.profiles WHERE family_id = v_family_id)
        ),
        '[]'::jsonb
      )
  );
END;
$$;
