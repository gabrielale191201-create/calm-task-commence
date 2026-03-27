
CREATE TABLE public.user_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_name text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON public.user_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own events"
  ON public.user_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_events_user_id ON public.user_events (user_id);
CREATE INDEX idx_user_events_event_name ON public.user_events (event_name);
CREATE INDEX idx_user_events_created_at ON public.user_events (created_at);
