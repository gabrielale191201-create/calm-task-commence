-- Add DELETE policy for push_subscriptions
-- Allows service role (edge functions) to delete subscriptions when users unsubscribe
CREATE POLICY "service can delete subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
USING (true);