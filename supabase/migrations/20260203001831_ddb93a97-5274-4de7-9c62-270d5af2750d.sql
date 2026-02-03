-- Block public SELECT on push_subscriptions table
-- Edge functions bypass RLS with service_role key, so this only affects client access
CREATE POLICY "block public select on push_subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
TO anon, authenticated 
USING (false);

-- Block public SELECT on reminders table
-- Edge functions bypass RLS with service_role key, so this only affects client access
CREATE POLICY "block public select on reminders" 
ON public.reminders 
FOR SELECT 
TO anon, authenticated 
USING (false);