CREATE TABLE public.user_google_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_google_calendar TO authenticated;
GRANT ALL ON public.user_google_calendar TO service_role;

ALTER TABLE public.user_google_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own google calendar connection"
  ON public.user_google_calendar FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google calendar connection"
  ON public.user_google_calendar FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google calendar connection"
  ON public.user_google_calendar FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own google calendar connection"
  ON public.user_google_calendar FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_google_calendar_updated_at
  BEFORE UPDATE ON public.user_google_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();