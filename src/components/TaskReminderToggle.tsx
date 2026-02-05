import { Bell } from 'lucide-react';

interface TaskReminderToggleProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

/**
 * TaskReminderToggle - Temporarily disabled
 * Push notification reminders will be available in a future release.
 * This component shows a "coming soon" message instead of the functional toggle.
 */
export function TaskReminderToggle({ scheduledDate, scheduledTime }: TaskReminderToggleProps) {
  // Only show for tasks with complete schedule info
  if (!scheduledDate || !scheduledTime) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bell size={14} className="opacity-50" />
        <span>Los recordatorios estarán disponibles próximamente</span>
      </div>
    </div>
  );
}