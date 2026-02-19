BEGIN;

-- Backup only the rows that will be removed by this rollback.
CREATE TABLE IF NOT EXISTS public.relationships_rollback_20260219 (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  relative_id uuid NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL
);

INSERT INTO public.relationships_rollback_20260219 (id, user_id, relative_id, type, created_at)
SELECT r.id, r.user_id, r.relative_id, r.type, r.created_at
FROM public.relationships r
WHERE r.created_at >= '2026-02-19T20:31:00Z'::timestamptz
  AND r.created_at <= '2026-02-19T20:34:30Z'::timestamptz
  AND r.type IN (
    'parent',
    'child',
    'sibling',
    'grandparent',
    'grandchild',
    'aunt_uncle',
    'maternal_aunt',
    'paternal_aunt',
    'maternal_uncle',
    'paternal_uncle',
    'niece_nephew',
    'cousin'
  )
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.relationships r
WHERE r.created_at >= '2026-02-19T20:31:00Z'::timestamptz
  AND r.created_at <= '2026-02-19T20:34:30Z'::timestamptz
  AND r.type IN (
    'parent',
    'child',
    'sibling',
    'grandparent',
    'grandchild',
    'aunt_uncle',
    'maternal_aunt',
    'paternal_aunt',
    'maternal_uncle',
    'paternal_uncle',
    'niece_nephew',
    'cousin'
  );

COMMIT;
