-- Lock down the app-releases storage bucket so only service_role can write/delete.
-- Public SELECT remains via the bucket's public flag.

DROP POLICY IF EXISTS "app_releases_service_role_insert" ON storage.objects;
DROP POLICY IF EXISTS "app_releases_service_role_update" ON storage.objects;
DROP POLICY IF EXISTS "app_releases_service_role_delete" ON storage.objects;

CREATE POLICY "app_releases_service_role_insert"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'app-releases');

CREATE POLICY "app_releases_service_role_update"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'app-releases')
WITH CHECK (bucket_id = 'app-releases');

CREATE POLICY "app_releases_service_role_delete"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'app-releases');

-- Revoke direct EXECUTE on SECURITY DEFINER trigger functions from anon/authenticated.
-- These are only invoked by triggers (which run with the trigger owner's privileges),
-- so they should not be callable via the PostgREST API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
