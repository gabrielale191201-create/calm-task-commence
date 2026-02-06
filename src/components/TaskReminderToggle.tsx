import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Capacitor } from '@capacitor/core';
import { useLocalNotifications, taskIdToNumericId } from '@/hooks/useLocalNotifications';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';
import { useAuthState, isGuestMode } from '@/hooks/useAuthState';
import { supabase } from '@/integrations/supabase/client';
import { parseDateString } from '@/lib/dateUtils';
import { ReminderPermissionModal } from './ReminderPermissionModal';

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
    // Don't show anything if not supported - feel native
    return null;
  }

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
    console.log('[Reminder] Enabling reminder for:', reminderTime.toISOString());
    setState({ status: 'loading' });

    try {
      if (isNative) {
        // Native: use Capacitor Local Notifications
        if (!hasNativePermission) {
          const granted = await requestNativePermissions();
          if (!granted) {
            setState({ status: 'idle' });
            return;
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
          setState({ status: 'idle' });
          return;
        }
        
      } else {
        // Web: use Web Push via backend
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
          setState({ status: 'idle' });
          return;
        }
      }

      // Save to localStorage for UI state
      localStorage.setItem(getReminderStorageKey(taskId), reminderTime.toISOString());
      setState({ 
        status: 'enabled',
        scheduledInfo: `${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime.getMinutes().toString().padStart(2, '0')}`
      });
      console.log('[Reminder] Reminder enabled successfully!');

    } catch (error: any) {
      console.error('[Reminder] Error:', error);
      setState({ status: 'idle' });
    }
  };

  const handlePermissionAndEnable = async () => {
    setPermissionModal({ open: false, variant: 'request' });
    
    let permissionGranted = false;
    
    if (isNative) {
      permissionGranted = await requestNativePermissions();
    } else {
      // Web: subscribe which also requests permission
      permissionGranted = await subscribeWebPush();
    }
    
    if (permissionGranted) {
      // Now check if we need to adjust time
      let targetDate = scheduledDate;
      let targetTime = scheduledTime;
      
      if (!hasValidFutureTime) {
        const nextValid = getNextValidTime(scheduledDate, scheduledTime);
        if (nextValid && onScheduleUpdate) {
          onScheduleUpdate(nextValid.date, nextValid.time);
          targetDate = nextValid.date;
          targetTime = nextValid.time;
        }
      }
      
      const reminderTime = calculateReminderTime(targetDate, targetTime);
      if (reminderTime) {
        await doEnableReminder(reminderTime);
      }
    }
  };

  const enableReminder = async () => {
    console.log('[Reminder] Starting enableReminder flow');
    
    // Check current permission status
    const currentPermission = isNative 
      ? (hasNativePermission ? 'granted' : 'default')
      : webPushPermission;
    
    // If denied, show denied modal
    if (currentPermission === 'denied') {
      setPermissionModal({ open: true, variant: 'denied' });
      return;
    }
    
    // If not granted, show request modal
    if (currentPermission !== 'granted' && !isWebPushSubscribed) {
      setPermissionModal({ open: true, variant: 'request' });
      return;
    }
    
    // Permission already granted - check time validity
    let targetDate = scheduledDate;
    let targetTime = scheduledTime;
    
    if (!hasValidFutureTime) {
      const nextValid = getNextValidTime(scheduledDate, scheduledTime);
      if (nextValid && onScheduleUpdate) {
        onScheduleUpdate(nextValid.date, nextValid.time);
        targetDate = nextValid.date;
        targetTime = nextValid.time;
      } else if (!nextValid) {
        // Can't compute a valid time
        return;
      }
    }
    
    const reminderTime = calculateReminderTime(targetDate, targetTime);
    if (reminderTime) {
      await doEnableReminder(reminderTime);
    }
  };

  const disableReminder = async () => {
    console.log('[Reminder] Disabling reminder');
    setState({ status: 'loading' });

    try {
      if (isNative) {
        await cancelNotificationByTaskId(taskId);
      } else {
        const deviceId = getDeviceId();
        await supabase.functions.invoke('delete-reminder', {
          body: { deviceId, taskId }
        });
      }

      localStorage.removeItem(getReminderStorageKey(taskId));
      setState({ status: 'idle' });
      console.log('[Reminder] Reminder disabled');

    } catch (error: any) {
      console.error('[Reminder] Disable error:', error);
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
  
  // Determine if switch should be disabled
  const currentPermission = isNative 
    ? (hasNativePermission ? 'granted' : 'default')
    : webPushPermission;
  const isPermissionDenied = currentPermission === 'denied';

  // Show helper text for missing/past time
  const showTimeHelper = hasMissingSchedule || (!hasValidFutureTime && !isEnabled);

  return (
    <>
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
            disabled={isLoading || (isPermissionDenied && !isEnabled)}
            aria-label="Activar recordatorio"
          />
        </div>

        {isEnabled && scheduledTime && (
          <p className="text-xs text-muted-foreground mt-1.5 ml-6">
            Te avisaré a las {scheduledTime}
          </p>
        )}

        {showTimeHelper && !isEnabled && (
          <p className="text-xs text-muted-foreground mt-1.5 ml-6">
            Elige una hora futura para poder recordarte
          </p>
        )}

        {isPermissionDenied && !isEnabled && !showTimeHelper && (
          <p className="text-xs text-muted-foreground mt-1.5 ml-6">
            Habilita recordatorios en ajustes del dispositivo
          </p>
        )}
      </div>

      <ReminderPermissionModal
        open={permissionModal.open}
        onOpenChange={(open) => setPermissionModal(prev => ({ ...prev, open }))}
        variant={permissionModal.variant}
        onActivate={handlePermissionAndEnable}
      />
    </>
  );
}
