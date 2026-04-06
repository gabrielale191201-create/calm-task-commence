ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS obstacle text;