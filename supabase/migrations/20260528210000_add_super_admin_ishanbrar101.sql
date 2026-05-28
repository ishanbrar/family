-- Grant super-admin access to ishanbrar101@yahoo.com

BEGIN;

INSERT INTO public.super_admins (email)
VALUES ('ishanbrar101@yahoo.com')
ON CONFLICT (email) DO NOTHING;

COMMIT;
