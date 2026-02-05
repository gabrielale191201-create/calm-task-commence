import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Capacitor } from '@capacitor/core';
import { useLocalNotifications, taskIdToNumericId } from '@/hooks/useLocalNotifications';
import { useAuthState, isGuestMode } from '@/hooks/useAuthState';
import { parseDateString } from '@/lib/dateUtils';

interface TaskReminderToggleProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

function getReminderStorageKey(taskId: string): string {
  return `focuson_reminder_${taskId}`;
}

type ReminderStatus = 'idle' | 'loading' | 'enabled' | 'error';

interface ReminderState {
  status: ReminderStatus;
  errorMessage?: string;
  errorDetails?: string;
}

export function TaskReminderToggle({ 
  taskId, 
  taskText, 
  scheduledDate, 
  scheduledTime 
}: TaskReminderToggleProps) {
  const { isAuthenticated } = useAuthState();
  const [state, setState] = useState<ReminderState>({ status: 'idle' });
  const { 
    isNative, 
    isSupported, 
    hasPermission, 
    requestPermissions, 
    scheduleNotification, 
    cancelNotificationByTaskId 
  } = useLocalNotifications();
  
  // Check if reminder is already set from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(getReminderStorageKey(taskId));
    if (stored) {
      setState({ status: 'enabled' });
    }
  }, [taskId]);

  // Don't show for tasks without complete schedule
  if (!scheduledDate || !scheduledTime) {
    return null;
  }

  // Guest mode - show login prompt (only needed for cloud sync, not local notifications)
  if (isGuestMode() && !isNative) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={14} className="opacity-50" />
          <span>Inicia sesión para activar recordatorios</span>
        </div>
      </div>
    );
  }

  // Native platform: always available
  // Web platform: needs auth for push
  if (!isNative && (!isAuthenticated)) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={14} className="opacity-50" />
          <span>Inicia sesión para activar recordatorios</span>
        </div>
      </div>
    );
  }

  // Web platform without native: show unsupported message
  if (!isNative && Capacitor.getPlatform() === 'web') {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={14} className="opacity-50" />
          <span>Instala la app para recordatorios</span>
        </div>
      </div>
    );
  }

  const calculateReminderTime = (): Date | null => {
    try {
      const date = parseDateString(scheduledDate);
      if (!date) return null;
      
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return null;
      
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch {
      return null;
    }
  };

  const enableReminder = async () => {
    console.log('[Reminder] Starting enableReminder flow (native local notifications)');
    setState({ status: 'loading' });

    try {
      // Step 1: Request permissions if needed
      if (!hasPermission) {
        console.log('[Reminder] Requesting notification permissions...');
        const granted = await requestPermissions();
        if (!granted) {
          throw new Error('PERMISSION_DENIED|Necesitas permitir las notificaciones para recibir recordatorios');
        }
      }

      // Step 2: Calculate reminder time
      const reminderTime = calculateReminderTime();
      if (!reminderTime) {
        throw new Error('INVALID_TIME|No se pudo calcular la hora del recordatorio');
      }

      // Check if reminder time is in the future
      if (reminderTime <= new Date()) {
        throw new Error('TIME_PASSED|La hora programada ya pasó');
      }

      // Step 3: Schedule local notification
      const notificationId = taskIdToNumericId(taskId);
      console.log('[Reminder] Scheduling local notification:', notificationId, 'for:', reminderTime.toISOString());
      
      const success = await scheduleNotification({
        id: notificationId,
        title: '⏰ Recordatorio',
        body: taskText,
        scheduleAt: reminderTime,
        extra: { taskId }
      });

      if (!success) {
        throw new Error('SCHEDULE_FAILED|No se pudo programar la notificación');
      }

      // Success - save to localStorage
      localStorage.setItem(getReminderStorageKey(taskId), reminderTime.toISOString());
      setState({ status: 'enabled' });
      console.log('[Reminder] Local notification scheduled successfully!');

    } catch (error: any) {
      console.error('[Reminder] Error:', error);
      const message = error.message || 'Error desconocido';
      const [code, displayMessage] = message.includes('|') 
        ? message.split('|') 
        : ['UNKNOWN', message];
      
      setState({ 
        status: 'error', 
        errorMessage: displayMessage,
        errorDetails: code
      });
    }
  };

  const disableReminder = async () => {
    console.log('[Reminder] Disabling reminder');
    setState({ status: 'loading' });

    try {
      await cancelNotificationByTaskId(taskId);
      localStorage.removeItem(getReminderStorageKey(taskId));
      setState({ status: 'idle' });
      console.log('[Reminder] Reminder disabled');

    } catch (error: any) {
      console.error('[Reminder] Disable error:', error);
      // Still remove from localStorage
      localStorage.removeItem(getReminderStorageKey(taskId));
      setState({ status: 'idle' });
    }
  };

  const handleToggle = () => {
    if (state.status === 'loading') return;
    
    if (state.status === 'enabled') {
      disableReminder();
    } else {
      enableReminder();
    }
  };

  const isEnabled = state.status === 'enabled';
  const isLoading = state.status === 'loading';
  const hasError = state.status === 'error';

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Bell size={14} className="text-primary" />
          ) : (
            <BellOff size={14} className="text-muted-foreground" />
          )}
          <span className="text-sm text-foreground">
            Recordatorio
          </span>
          {isLoading && (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          )}
          {isEnabled && (
            <CheckCircle2 size={14} className="text-primary" />
          )}
        </div>
        
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          aria-label="Activar recordatorio"
        />
      </div>

      {isEnabled && (
        <p className="text-xs text-muted-foreground mt-1.5 ml-6">
          Recibirás una notificación a las {scheduledTime}
        </p>
      )}

      {hasError && state.errorMessage && (
        <div className="mt-2 p-2 bg-destructive/10 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-destructive">{state.errorMessage}</p>
              {state.errorDetails && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Código: {state.errorDetails}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
