import { useState } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface TaskReminderToggleProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export function TaskReminderToggle({ taskId, taskText, scheduledDate, scheduledTime }: TaskReminderToggleProps) {
  const { isSupported, scheduleReminder, permission } = usePushNotifications();
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Only show if push is supported and task has scheduling info
  if (!isSupported) return null;

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Show datetime picker
      setIsEnabled(true);
      // Default to task's scheduled time if available, otherwise 30 min from now
      if (scheduledDate && scheduledTime) {
        setReminderDateTime(`${scheduledDate}T${scheduledTime}`);
      } else {
        const defaultTime = new Date(Date.now() + 30 * 60 * 1000);
        setReminderDateTime(defaultTime.toISOString().slice(0, 16));
      }
    } else {
      setIsEnabled(false);
      setReminderDateTime('');
    }
  };

  const handleSchedule = async () => {
    if (!reminderDateTime) {
      toast.error('Selecciona fecha y hora para el recordatorio');
      return;
    }

    const runAt = new Date(reminderDateTime);
    if (runAt <= new Date()) {
      toast.error('El recordatorio debe ser en el futuro');
      return;
    }

    setIsLoading(true);
    try {
      const success = await scheduleReminder(taskId, taskText, runAt);
      if (success) {
        toast.success(`Recordatorio programado para ${runAt.toLocaleString('es-ES')}`);
      } else {
        if (permission === 'denied') {
          toast.error('Debes permitir las notificaciones en tu navegador');
        } else {
          toast.error('No se pudo programar el recordatorio');
        }
        setIsEnabled(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isEnabled ? <Bell size={14} className="text-primary" /> : <BellOff size={14} />}
          <span>Recordatorio</span>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
      </div>

      {isEnabled && (
        <div className="mt-3 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <input
              type="datetime-local"
              value={reminderDateTime}
              onChange={(e) => setReminderDateTime(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <button
            onClick={handleSchedule}
            disabled={isLoading || !reminderDateTime}
            className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isLoading ? 'Guardando...' : 'Programar alarmita'}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Recibirás una notificación aunque la app esté cerrada
          </p>
        </div>
      )}
    </div>
  );
}
