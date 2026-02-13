-- Legacy: add specific maternal/paternal aunt/uncle relationship types

BEGIN;

ALTER TABLE public.relationships
  DROP CONSTRAINT IF EXISTS relationships_type_check;

ALTER TABLE public.relationships
  ADD CONSTRAINT relationships_type_check
  CHECK (
    type IN (
      'parent',
      'child',
      'sibling',
      'spouse',
      'half_sibling',
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
  );

COMMIT;
