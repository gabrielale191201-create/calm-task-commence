-- Remove the unnecessary public SELECT policy on push_subscriptions table
-- Edge functions use service role key which bypasses RLS, so this policy is not needed
-- and it exposes sensitive push notification credentials (endpoint, p256dh, auth) to public

DROP POLICY "service can select subscriptions" ON public.push_subscriptions;