import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Capacitor } from '@capacitor/core';
import { useLocalNotifications, taskIdToNumericId } from '@/hooks/useLocalNotifications';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';
import { useAuthState, isGuestMode } from '@/hooks/useAuthState';
import { usePWAInstalled } from '@/hooks/usePWAInstalled';
import { supabase } from '@/integrations/supabase/client';
import { parseDateString } from '@/lib/dateUtils';

interface TaskReminderToggleProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
  reminderEnabled?: boolean;
  onReminderChange?: (enabled: boolean) => void;
}

type ReminderStatus = 'idle' | 'loading' | 'enabled' | 'error';

interface ReminderState {
  status: ReminderStatus;
  errorMessage?: string;
}

export function TaskReminderToggle({ 
  taskId, 
  taskText, 
  scheduledDate, 
  scheduledTime,
  reminderEnabled = false,
  onReminderChange
}: TaskReminderToggleProps) {
  const { isAuthenticated } = useAuthState();
  const [state, setState] = useState<ReminderState>({ 
    status: reminderEnabled ? 'enabled' : 'idle' 
  });
  const isPWAInstalled = usePWAInstalled();
  
  // Native notifications (Capacitor)
  const { 
    isNative, 
    hasPermission: hasNativePermission, 
    requestPermissions: requestNativePermissions, 
    scheduleNotification, 
    cancelNotificationByTaskId 
  } = useLocalNotifications();
  
  // Web Push notifications (PWA)
  const {
    isSupported: isWebPushSupported,
    isSubscribed: isWebPushSubscribed,
    permission: webPushPermission,
    subscribe: subscribeWebPush
  } = useWebPushNotifications();

  // Sync state with prop
  useEffect(() => {
    setState({ status: reminderEnabled ? 'enabled' : 'idle' });
  }, [reminderEnabled]);

  // Don't show for tasks without complete schedule
  if (!scheduledDate || !scheduledTime) {
    return null;
  }

  // Guest mode - show login prompt
  if (isGuestMode()) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={14} className="opacity-50" />
          <span>Inicia sesión para activar recordatorios</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={14} className="opacity-50" />
          <span>Inicia sesión para activar recordatorios</span>
        </div>
      </div>
    );
  }

  // Web platform - check if notifications are supported
  const isWeb = !isNative && Capacitor.getPlatform() === 'web';
  
  if (isWeb && !isWebPushSupported) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={14} className="opacity-50" />
          <span>Tu navegador no soporta notificaciones</span>
        </div>
      </div>
    );
  }

  // Show suggestion to install for better experience (but don't block)
  const showInstallSuggestion = isWeb && !isPWAInstalled;

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
    console.log('[Reminder] Starting enableReminder flow');
    setState({ status: 'loading' });

    try {
      const reminderTime = calculateReminderTime();
      if (!reminderTime) {
        throw new Error('No se pudo calcular la hora del recordatorio');
      }

      if (reminderTime <= new Date()) {
        throw new Error('La hora programada ya pasó');
      }

      if (isNative) {
        // Native: use Capacitor Local Notifications
        if (!hasNativePermission) {
          const granted = await requestNativePermissions();
          if (!granted) {
            throw new Error('Necesitas permitir las notificaciones');
          }
        }

        const notificationId = taskIdToNumericId(taskId);
        const success = await scheduleNotification({
          id: notificationId,
          title: 'Focus On',
          body: `Te acompaño con esto: ${taskText}`,
          scheduleAt: reminderTime,
          extra: { taskId }
        });

        if (!success) {
          throw new Error('No se pudo programar la notificación');
        }
      } else {
        // Web: use Web Push
        if (webPushPermission !== 'granted' || !isWebPushSubscribed) {
          const subscribed = await subscribeWebPush();
          if (!subscribed) {
            // Don't show error, just soft message
            setState({ 
              status: 'error', 
              errorMessage: 'Si activas notificaciones, te avisaré a la hora de tus tareas.' 
            });
            return;
          }
        }
      }

      // Update task in database
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          reminder_enabled: true,
          reminder_sent_at: null // Reset in case it was sent before
        })
        .eq('id', taskId);

      if (updateError) {
        console.error('[Reminder] Failed to update task:', updateError);
        throw new Error('No se pudo guardar el recordatorio');
      }

      setState({ status: 'enabled' });
      onReminderChange?.(true);
      console.log('[Reminder] Reminder enabled successfully');

    } catch (error: any) {
      console.error('[Reminder] Error:', error);
      setState({ 
        status: 'error', 
        errorMessage: error.message || 'Error al activar recordatorio'
      });
    }
  };

  const disableReminder = async () => {
    console.log('[Reminder] Disabling reminder');
    setState({ status: 'loading' });

    try {
      if (isNative) {
        await cancelNotificationByTaskId(taskId);
      }

      // Update task in database
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ reminder_enabled: false })
        .eq('id', taskId);

      if (updateError) {
        console.error('[Reminder] Failed to update task:', updateError);
      }

      setState({ status: 'idle' });
      onReminderChange?.(false);
      console.log('[Reminder] Reminder disabled');

    } catch (error: any) {
      console.error('[Reminder] Disable error:', error);
      setState({ status: 'idle' });
      onReminderChange?.(false);
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
          Te avisaré a las {scheduledTime}
        </p>
      )}

      {showInstallSuggestion && !isEnabled && (
        <p className="text-xs text-muted-foreground mt-1.5 ml-6">
          Instala la app para mejor experiencia
        </p>
      )}

      {hasError && state.errorMessage && (
        <div className="mt-2 p-2 bg-muted/50 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{state.errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
