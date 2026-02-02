-- Policies for edge function operations (using service role, but adding for completeness)
DROP POLICY IF EXISTS "service can select subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service can update subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service can select reminders" ON public.reminders;
DROP POLICY IF EXISTS "service can update reminders" ON public.reminders;
DROP POLICY IF EXISTS "service can delete reminders" ON public.reminders;

-- Allow SELECT for reading subscriptions
CREATE POLICY "service can select subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (true);

-- Allow UPDATE for upsert operations
CREATE POLICY "service can update subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (true);

-- Allow SELECT for reading reminders
CREATE POLICY "service can select reminders"
ON public.reminders
FOR SELECT
USING (true);

-- Allow UPDATE for marking as sent
CREATE POLICY "service can update reminders"
ON public.reminders
FOR UPDATE
USING (true);

-- Allow DELETE for cleanup
CREATE POLICY "service can delete reminders"
ON public.reminders
FOR DELETE
USING (true);