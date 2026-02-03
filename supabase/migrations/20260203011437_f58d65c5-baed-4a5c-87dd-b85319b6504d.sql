-- Add user_id column to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to reminders
ALTER TABLE public.reminders 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "block public delete on push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "block public insert on push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "block public select on push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "block public update on push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "block public delete on reminders" ON public.reminders;
DROP POLICY IF EXISTS "block public insert on reminders" ON public.reminders;
DROP POLICY IF EXISTS "block public select on reminders" ON public.reminders;
DROP POLICY IF EXISTS "block public update on reminders" ON public.reminders;

-- Create user-scoped RLS policies for push_subscriptions
CREATE POLICY "Users can view own push_subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push_subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push_subscriptions" 
ON public.push_subscriptions 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push_subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create user-scoped RLS policies for reminders
CREATE POLICY "Users can view own reminders" 
ON public.reminders 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" 
ON public.reminders 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" 
ON public.reminders 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" 
ON public.reminders 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);