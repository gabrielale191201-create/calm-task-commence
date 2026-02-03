-- Drop the permissive UPDATE/DELETE policies that use USING (true)
DROP POLICY IF EXISTS "service can update subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service can delete subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service can update reminders" ON public.reminders;
DROP POLICY IF EXISTS "service can delete reminders" ON public.reminders;

-- Create restrictive policies that block anon/authenticated from UPDATE/DELETE
-- Edge functions using service_role bypass RLS entirely, so they still work

CREATE POLICY "block public update on push_subscriptions" 
ON public.push_subscriptions 
FOR UPDATE 
TO anon, authenticated 
USING (false);

CREATE POLICY "block public delete on push_subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
TO anon, authenticated 
USING (false);

CREATE POLICY "block public update on reminders" 
ON public.reminders 
FOR UPDATE 
TO anon, authenticated 
USING (false);

CREATE POLICY "block public delete on reminders" 
ON public.reminders 
FOR DELETE 
TO anon, authenticated 
USING (false);