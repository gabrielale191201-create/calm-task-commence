-- Remove the unnecessary public SELECT policy on reminders table
-- Edge functions use service role key which bypasses RLS, so this policy is not needed
-- and it exposes all reminder data (task_text, device_id, run_at) to public

DROP POLICY "service can select reminders" ON public.reminders;