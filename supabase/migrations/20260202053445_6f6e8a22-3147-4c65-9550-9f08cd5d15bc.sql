-- Crear función update_updated_at_column si no existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can insert subscription" ON public.push_subscriptions;
CREATE POLICY "public can insert subscription"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- REMINDERS
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES public.push_subscriptions(device_id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  task_text TEXT NOT NULL,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can insert reminders" ON public.reminders;
CREATE POLICY "public can insert reminders"
ON public.reminders
FOR INSERT
WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON public.reminders (run_at) WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_reminders_device ON public.reminders (device_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();