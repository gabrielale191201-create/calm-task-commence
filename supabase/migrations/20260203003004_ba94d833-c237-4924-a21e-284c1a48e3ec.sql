-- Drop the existing permissive INSERT policies
DROP POLICY IF EXISTS "public can insert subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "public can insert reminders" ON public.reminders;

-- Create restrictive INSERT policies
-- Edge functions bypass RLS with service_role key, so this only affects direct client access
CREATE POLICY "block public insert on push_subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (false);

CREATE POLICY "block public insert on reminders" 
ON public.reminders 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (false);