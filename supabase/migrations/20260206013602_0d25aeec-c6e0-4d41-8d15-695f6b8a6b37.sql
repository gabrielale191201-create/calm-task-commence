-- Add reminder fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone NULL;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_tasks_pending_reminders 
ON public.tasks (scheduled_date, scheduled_time, reminder_enabled, reminder_sent_at)
WHERE reminder_enabled = true AND reminder_sent_at IS NULL AND status = 'pending';