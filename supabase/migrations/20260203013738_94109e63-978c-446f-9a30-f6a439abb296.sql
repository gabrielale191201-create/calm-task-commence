-- First, delete any orphaned rows with NULL user_id (legacy data from before auth was required)
DELETE FROM public.push_subscriptions WHERE user_id IS NULL;
DELETE FROM public.reminders WHERE user_id IS NULL;

-- Make user_id NOT NULL in push_subscriptions
ALTER TABLE public.push_subscriptions 
ALTER COLUMN user_id SET NOT NULL;

-- Make user_id NOT NULL in reminders  
ALTER TABLE public.reminders 
ALTER COLUMN user_id SET NOT NULL;