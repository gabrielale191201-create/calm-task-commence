import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Capacitor } from '@capacitor/core';
import { useLocalNotifications, taskIdToNumericId } from '@/hooks/useLocalNotifications';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';
import { useAuthState, isGuestMode } from '@/hooks/useAuthState';
import { supabase } from '@/integrations/supabase/client';
import { parseDateString } from '@/lib/dateUtils';
import { ReminderPermissionModal } from './ReminderPermissionModal';
import { toast } from 'sonner';

interface TaskReminderToggleProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
  onScheduleUpdate?: (newDate: string, newTime: string) => void;
}

function getReminderStorageKey(taskId: string): string {
  return `focuson_reminder_${taskId}`;
}

function getDeviceId(): string {
  const key = 'focuson_device_id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

type ReminderStatus = 'idle' | 'loading' | 'enabled';

interface ReminderState {
  status: ReminderStatus;
  scheduledInfo?: string;
}

// Calculate next valid reminder time (at least 2 minutes in the future)
function getNextValidTime(scheduledDate?: string, scheduledTime?: string): { date: string; time: string } | null {
  const now = new Date();
  const minFutureMs = 2 * 60 * 1000; // 2 minutes
  
  if (!scheduledDate || !scheduledTime) {
    return null;
  }
  
  try {
    const scheduled = parseDateString(scheduledDate);
    if (!scheduled) return null;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    scheduled.setHours(hours, minutes, 0, 0);
    
    // If time is in the future, use it as-is
    if (scheduled.getTime() > now.getTime() + minFutureMs) {
      return { date: scheduledDate, time: scheduledTime };
    }
    
    // Time has passed - suggest same time tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);
    
    const newDate = tomorrow.toISOString().split('T')[0];
    return { date: newDate, time: scheduledTime };
  } catch {
    return null;
  }
}

function isValidFutureTime(scheduledDate?: string, scheduledTime?: string): boolean {
  if (!scheduledDate || !scheduledTime) return false;
  
  try {
    const scheduled = parseDateString(scheduledDate);
    if (!scheduled) return false;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return false;
    
    scheduled.setHours(hours, minutes, 0, 0);
    
    // Must be at least 1 minute in the future
    return scheduled.getTime() > Date.now() + 60000;
  } catch {
    return false;
  }
}

export function TaskReminderToggle({ 
  taskId, 
  taskText, 
  scheduledDate, 
  scheduledTime,
  onScheduleUpdate
}: TaskReminderToggleProps) {
  const { isAuthenticated } = useAuthState();
  
  const hasStoredReminder = () => !!localStorage.getItem(getReminderStorageKey(taskId));
  
  const [state, setState] = useState<ReminderState>({ 
    status: hasStoredReminder() ? 'enabled' : 'idle' 
  });
  
  const [permissionModal, setPermissionModal] = useState<{
    open: boolean;
    variant: 'request' | 'denied';
  }>({ open: false, variant: 'request' });
  
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

  // Re-check stored reminder status on mount
  useEffect(() => {
    if (hasStoredReminder()) {
      setState({ status: 'enabled' });
    }
  }, [taskId]);

  // Check if we have valid future datetime
  const hasValidFutureTime = isValidFutureTime(scheduledDate, scheduledTime);
  const hasMissingSchedule = !scheduledDate || !scheduledTime;
  
  // Web platform - check if notifications are supported
  const isWeb = !isNative && Capacitor.getPlatform() === 'web';

  const calculateReminderTime = (date?: string, time?: string): Date | null => {
    const d = date || scheduledDate;
    const t = time || scheduledTime;
    
    if (!d || !t) return null;
    
    try {
      const parsed = parseDateString(d);
      if (!parsed) return null;
      
      const [hours, minutes] = t.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return null;
      
      parsed.setHours(hours, minutes, 0, 0);
      return parsed;
    } catch {
      return null;
    }
  };

  const doEnableReminder = async (reminderTime: Date) => {
    console.log('[Reminder] Scheduling reminder for:', reminderTime.toISOString());
    setState({ status: 'loading' });

    try {
      if (isNative) {
        // Native: use Capacitor Local Notifications
        console.log('[Reminder] Using native notifications');
        if (!hasNativePermission) {
          const granted = await requestNativePermissions();
          if (!granted) {
            console.log('[Reminder] Native permission denied');
            toast.error('No se pudo activar el recordatorio');
            setState({ status: 'idle' });
            return false;
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
          console.error('[Reminder] Failed to schedule native notification');
          toast.error('No pude programar el recordatorio. Reintenta.');
          setState({ status: 'idle' });
          return false;
        }
        
      } else {
        // Web: use Web Push via backend
        console.log('[Reminder] Using web push notifications');
        const deviceId = getDeviceId();
        
        const { error } = await supabase.functions.invoke('save-reminder', {
          body: {
            deviceId,
            taskId,
            taskText,
            runAt: reminderTime.toISOString()
          }
        });

        if (error) {
          console.error('[Reminder] Failed to save reminder:', error);
          toast.error('No pude programar el recordatorio. Reintenta.');
          setState({ status: 'idle' });
          return false;
        }
      }

      // Save to localStorage for UI state
      localStorage.setItem(getReminderStorageKey(taskId), reminderTime.toISOString());
      setState({ 
        status: 'enabled',
        scheduledInfo: `${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime.getMinutes().toString().padStart(2, '0')}`
      });
      
      console.log('[Reminder] ✓ Reminder scheduled successfully');
      toast.success('Listo. Te avisaré a tiempo.');
      return true;

    } catch (error: any) {
      console.error('[Reminder] Error scheduling:', error);
      toast.error('No pude programar el recordatorio. Reintenta.');
      setState({ status: 'idle' });
      return false;
    }
  };

  const handlePermissionGranted = async () => {
    console.log('[Reminder] Permission granted callback, closing modal first');
    // Close modal immediately, defer the rest
    setPermissionModal({ open: false, variant: 'request' });
    
    // Defer permission request to next tick to avoid DOM conflicts
    setTimeout(async () => {
      console.log('[Reminder] Deferred: requesting actual permission');
      let permissionGranted = false;
      
      if (isNative) {
        permissionGranted = await requestNativePermissions();
        console.log('[Reminder] Native permission result:', permissionGranted);
      } else {
        // Web: subscribe which also requests permission
        permissionGranted = await subscribeWebPush();
        console.log('[Reminder] Web push subscription result:', permissionGranted);
      }
      
      if (!permissionGranted) {
        console.log('[Reminder] Permission was not granted');
        toast('Recordatorios desactivados');
        return;
      }
      
      // Now schedule the reminder
      let targetDate = scheduledDate;
      let targetTime = scheduledTime;
      
      if (!hasValidFutureTime) {
        const nextValid = getNextValidTime(scheduledDate, scheduledTime);
        if (nextValid) {
          if (onScheduleUpdate) {
            onScheduleUpdate(nextValid.date, nextValid.time);
          }
          targetDate = nextValid.date;
          targetTime = nextValid.time;
          console.log('[Reminder] Auto-adjusted time to:', nextValid);
        }
      }
      
      const reminderTime = calculateReminderTime(targetDate, targetTime);
      if (reminderTime) {
        await doEnableReminder(reminderTime);
      } else {
        console.error('[Reminder] Could not calculate reminder time');
        toast.error('Elige una hora futura para poder recordarte');
      }
    }, 0);
  };

  const enableReminder = () => {
    console.log('[Reminder] === ENABLE FLOW STARTED ===');
    console.log('[Reminder] Task:', taskId, 'Date:', scheduledDate, 'Time:', scheduledTime);
    
    // STEP A: Validate date/time
    if (hasMissingSchedule) {
      console.log('[Reminder] Missing date or time');
      toast('Elige una hora futura para poder recordarte');
      return;
    }
    
    if (!hasValidFutureTime) {
      console.log('[Reminder] Time is in the past, attempting auto-fix');
      const nextValid = getNextValidTime(scheduledDate, scheduledTime);
      
      if (nextValid && onScheduleUpdate) {
        console.log('[Reminder] Auto-fixing to:', nextValid);
        onScheduleUpdate(nextValid.date, nextValid.time);
        toast('Te lo programo para la próxima hora disponible');
        
        // Defer scheduling to next tick
        setTimeout(async () => {
          const reminderTime = calculateReminderTime(nextValid.date, nextValid.time);
          if (reminderTime) {
            // Check permission first before scheduling
            const currentPermission = isNative 
              ? (hasNativePermission ? 'granted' : 'default')
              : webPushPermission;
            
            console.log('[Reminder] Current permission:', currentPermission);
            
            if (currentPermission === 'denied') {
              setPermissionModal({ open: true, variant: 'denied' });
              return;
            }
            
            if (currentPermission !== 'granted' && !isWebPushSubscribed) {
              setPermissionModal({ open: true, variant: 'request' });
              return;
            }
            
            await doEnableReminder(reminderTime);
          }
        }, 0);
        return;
      } else if (!nextValid) {
        console.log('[Reminder] Could not compute next valid time');
        toast('Elige una hora futura para poder recordarte');
        return;
      }
    }
    
    // STEP B: Check permissions
    const currentPermission = isNative 
      ? (hasNativePermission ? 'granted' : 'default')
      : webPushPermission;
    
    console.log('[Reminder] Permission status:', currentPermission);
    console.log('[Reminder] isWebPushSubscribed:', isWebPushSubscribed);
    
    if (currentPermission === 'denied') {
      console.log('[Reminder] Permission denied, showing modal');
      // Defer modal opening to next tick
      setTimeout(() => {
        setPermissionModal({ open: true, variant: 'denied' });
      }, 0);
      return;
    }
    
    if (currentPermission !== 'granted' && !isWebPushSubscribed) {
      console.log('[Reminder] Permission not granted, showing request modal');
      // Defer modal opening to next tick
      setTimeout(() => {
        setPermissionModal({ open: true, variant: 'request' });
      }, 0);
      return;
    }
    
    // STEP C: Permission granted, schedule reminder
    console.log('[Reminder] Permission granted, scheduling...');
    const reminderTime = calculateReminderTime();
    
    if (reminderTime) {
      // Defer scheduling to next tick
      setTimeout(async () => {
        await doEnableReminder(reminderTime);
      }, 0);
    } else {
      console.error('[Reminder] Failed to calculate reminder time');
      toast.error('No pude calcular la hora del recordatorio');
    }
  };

  const disableReminder = () => {
    console.log('[Reminder] === DISABLE FLOW STARTED ===');
    setState({ status: 'loading' });

    // Defer actual work to next tick
    setTimeout(async () => {
      try {
        if (isNative) {
          await cancelNotificationByTaskId(taskId);
          console.log('[Reminder] Native notification cancelled');
        } else {
          const deviceId = getDeviceId();
          await supabase.functions.invoke('delete-reminder', {
            body: { deviceId, taskId }
          });
          console.log('[Reminder] Web reminder deleted');
        }

        localStorage.removeItem(getReminderStorageKey(taskId));
        setState({ status: 'idle' });
        toast('Recordatorio desactivado');
        console.log('[Reminder] ✓ Reminder disabled successfully');

      } catch (error: any) {
        console.error('[Reminder] Disable error:', error);
        // Still clean up local state
        localStorage.removeItem(getReminderStorageKey(taskId));
        setState({ status: 'idle' });
        toast('Recordatorio desactivado');
      }
    }, 0);
  };

  const handleToggle = () => {
    console.log('[Reminder] Toggle clicked, current status:', state.status);
    
    if (state.status === 'loading') {
      console.log('[Reminder] Already loading, ignoring click');
      return;
    }
    
    if (state.status === 'enabled') {
      disableReminder();
    } else {
      enableReminder();
    }
  };

  const isEnabled = state.status === 'enabled';
  const isLoading = state.status === 'loading';

  // Show helper text for missing/past time only when not enabled
  const showTimeHelper = (hasMissingSchedule || !hasValidFutureTime) && !isEnabled;

  // Guest mode or not authenticated - show login prompt (always mounted for stability)
  const showLoginPrompt = isGuestMode() || !isAuthenticated;
  
  // Web platform without support - hide entirely
  if (isWeb && !isWebPushSupported) {
    console.log('[Reminder] Web push not supported on this device');
    return null;
  }

  return (
    <>
      {/* Always keep this container mounted for DOM stability */}
      <div className="mt-3 pt-3 border-t border-border/30">
        {showLoginPrompt ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell size={14} className="opacity-50" />
            <span>Inicia sesión para activar recordatorios</span>
          </div>
        ) : (
          <>
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
              
              {/* Switch is ALWAYS clickable - never disabled based on permissions */}
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={isLoading}
                aria-label="Activar recordatorio"
              />
            </div>

            {isEnabled && scheduledTime && (
              <p className="text-xs text-muted-foreground mt-1.5 ml-6">
                Te avisaré a las {scheduledTime}
              </p>
            )}

            {showTimeHelper && (
              <p className="text-xs text-muted-foreground mt-1.5 ml-6">
                Elige una hora futura para poder recordarte
              </p>
            )}
          </>
        )}
      </div>

      {/* Modal always mounted but controlled by open state */}
      <ReminderPermissionModal
        open={permissionModal.open}
        onOpenChange={(open) => setPermissionModal(prev => ({ ...prev, open }))}
        variant={permissionModal.variant}
        onActivate={handlePermissionGranted}
      />
    </>
  );
}
