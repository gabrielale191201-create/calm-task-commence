import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Clock, AlertCircle, LogIn } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useGuestMode } from '@/hooks/useGuestMode';
import { toast } from 'sonner';

interface TaskReminderToggleProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export function TaskReminderToggle({ taskId, taskText, scheduledDate, scheduledTime }: TaskReminderToggleProps) {
  const { isSupported, scheduleReminder, permission, subscribe, isAuthenticated } = usePushNotifications();
  const { isGuest } = useGuestMode();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'datetime' | 'ready'>('idle');

  // Check if we can show reminders at all
  const canShowReminders = isSupported && !isGuest;

  // Initialize datetime when opening
  useEffect(() => {
    if (step === 'datetime' && !reminderDateTime) {
      if (scheduledDate && scheduledTime) {
        setReminderDateTime(`${scheduledDate}T${scheduledTime}`);
      } else {
        const defaultTime = new Date(Date.now() + 30 * 60 * 1000);
        setReminderDateTime(defaultTime.toISOString().slice(0, 16));
      }
    }
  }, [step, scheduledDate, scheduledTime, reminderDateTime]);

  // Handle toggle - only changes local UI state, doesn't schedule yet
  const handleToggle = useCallback(async (checked: boolean) => {
    if (!checked) {
      // Turning off - reset state
      setIsEnabled(false);
      setStep('idle');
      setReminderDateTime('');
      return;
    }

    // Check notification permission first
    if (permission === 'denied') {
      toast.error('Las notificaciones están bloqueadas en tu navegador. Actívalas en la configuración.');
      return;
    }

    // Request permission if needed
    if (permission === 'default') {
      setIsLoading(true);
      const granted = await subscribe();
      setIsLoading(false);
      
      if (!granted) {
        toast.info('Necesitas permitir notificaciones para usar recordatorios');
        return;
      }
    }

    // Enable and show datetime picker
    setIsEnabled(true);
    setStep('datetime');
  }, [permission, subscribe]);

  // Validate and schedule the reminder
  const handleSchedule = useCallback(async () => {
    if (!reminderDateTime) {
      toast.error('Selecciona fecha y hora para el recordatorio');
      return;
    }

    const runAt = new Date(reminderDateTime);
    const now = new Date();
    
    if (runAt <= now) {
      toast.error('El recordatorio debe ser en el futuro');
      return;
    }

    // Check if it's too far in the future (max 1 year)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (runAt > maxDate) {
      toast.error('El recordatorio no puede ser más de un año en el futuro');
      return;
    }

    setIsLoading(true);
    try {
      const success = await scheduleReminder(taskId, taskText, runAt);
      
      if (success) {
        setStep('ready');
        toast.success(`Recordatorio: ${runAt.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}`);
      } else {
        // If scheduling failed but we have permission, it's likely a backend issue
        toast.error('No se pudo guardar el recordatorio. Intenta de nuevo.');
        setIsEnabled(false);
        setStep('idle');
      }
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      toast.error('Error al programar el recordatorio');
      setIsEnabled(false);
      setStep('idle');
    } finally {
      setIsLoading(false);
    }
  }, [reminderDateTime, scheduleReminder, taskId, taskText]);

  // Guest mode - show login prompt instead
  if (isGuest) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BellOff size={14} />
          <span className="flex-1">Recordatorios</span>
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <LogIn size={12} />
            <span>Inicia sesión</span>
          </div>
        </div>
      </div>
    );
  }

  // Not supported - don't render at all
  if (!isSupported) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isEnabled ? (
            <Bell size={14} className="text-primary" />
          ) : (
            <BellOff size={14} />
          )}
          <span>Recordatorio</span>
          {step === 'ready' && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Activo
            </span>
          )}
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
      </div>

      {/* Datetime picker - only show when enabled and not yet scheduled */}
      {isEnabled && step === 'datetime' && (
        <div className="mt-3 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground flex-shrink-0" />
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
            className="w-full py-2.5 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isLoading ? 'Guardando...' : 'Programar recordatorio'}
          </button>
          
          <p className="text-xs text-muted-foreground text-center">
            Recibirás una notificación aunque la app esté cerrada
          </p>
        </div>
      )}

      {/* Scheduled confirmation */}
      {step === 'ready' && (
        <div className="mt-3 animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 p-2 rounded-lg">
            <Bell size={12} />
            <span>
              {new Date(reminderDateTime).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      )}

      {/* Permission blocked warning */}
      {permission === 'denied' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle size={12} />
          <span>Notificaciones bloqueadas en el navegador</span>
        </div>
      )}
    </div>
  );
}
