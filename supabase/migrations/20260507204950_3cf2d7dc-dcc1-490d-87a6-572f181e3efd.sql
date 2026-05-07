-- Add missing DELETE/UPDATE RLS policies

CREATE POLICY "Users can delete own mental_dumps"
ON public.mental_dumps FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram_link_codes"
ON public.telegram_link_codes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own focus_sessions"
ON public.focus_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus_sessions"
ON public.focus_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_events"
ON public.user_events FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_telegram"
ON public.user_telegram FOR DELETE TO authenticated
USING (auth.uid() = user_id);