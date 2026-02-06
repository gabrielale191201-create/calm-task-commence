import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseDateString } from '@/lib/dateUtils';
import { useAuthState, isGuestMode } from '@/hooks/useAuthState';
import { useLocalNotifications, taskIdToNumericId } from '@/hooks/useLocalNotifications';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';
import { ReminderPermissionModal } from '@/components/ReminderPermissionModal';

interface TaskReminderToggleStableProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
  /** Optional: if provided, we can auto-adjust the task schedule when the time is in the past */
  onScheduleUpdate?: (newDate: string, newTime: string) => void;
}

type PermissionModalVariant = 'request' | 'denied';

type UIStatus = 'idle' | 'loading';

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

function isValidFutureTime(scheduledDate?: string, scheduledTime?: string): boolean {
  if (!scheduledDate || !scheduledTime) return false;
  try {
    const d = parseDateString(scheduledDate);
    if (!d) return false;
    const [h, m] = scheduledTime.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    d.setHours(h, m, 0, 0);
    return d.getTime() > Date.now() + 60_000; // 1 min buffer
  } catch {
    return false;
  }
}

function calculateReminderTime(date?: string, time?: string): Date | null {
  if (!date || !time) return null;
  try {
    const d = parseDateString(date);
    if (!d) return null;
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    d.setHours(h, m, 0, 0);
    return d;
  } catch {
    return null;
  }
}

/** Next valid time: now + 10 minutes (calm autofix) */
function proposeNextValidTime(): { date: string; time: string; at: Date } {
  const now = new Date();
  const at = new Date(now.getTime() + 10 * 60 * 1000);
  at.setSeconds(0, 0);

  const yyyy = at.getFullYear();
  const mm = String(at.getMonth() + 1).padStart(2, '0');
  const dd = String(at.getDate()).padStart(2, '0');
  const hh = String(at.getHours()).padStart(2, '0');
  const min = String(at.getMinutes()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
    at,
  };
}

export function TaskReminderToggleStable({
  taskId,
  taskText,
  scheduledDate,
  scheduledTime,
  onScheduleUpdate,
}: TaskReminderToggleStableProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthState();

  const {
    isNative,
    hasPermission: hasNativePermission,
    requestPermissions: requestNativePermissions,
    scheduleNotification,
    cancelNotificationByTaskId,
  } = useLocalNotifications();

  const {
    isSupported: isWebPushSupported,
    isSubscribed: isWebPushSubscribed,
    permission: webPushPermission,
    subscribe: subscribeWebPush,
  } = useWebPushNotifications();

  const isWeb = useMemo(() => !isNative && Capacitor.getPlatform() === 'web', [isNative]);
  const canUseWeb = !isWeb || isWebPushSupported;

  // Source of truth: localStorage (what user last enabled)
  const [enabled, setEnabled] = useState<boolean>(() => !!localStorage.getItem(getReminderStorageKey(taskId)));
  const [status, setStatus] = useState<UIStatus>('idle');

  const [permissionModal, setPermissionModal] = useState<{ open: boolean; variant: PermissionModalVariant }>({
    open: false,
    variant: 'request',
  });

  // When user clicks ON and we need to request permission, we store a pending target time here
  const pendingScheduleRef = useRef<Date | null>(null);

  useEffect(() => {
    setEnabled(!!localStorage.getItem(getReminderStorageKey(taskId)));
  }, [taskId]);

  const hasMissingSchedule = !scheduledDate || !scheduledTime;
  const hasValidTime = isValidFutureTime(scheduledDate, scheduledTime);
  const showTimeHelper = (!hasValidTime || hasMissingSchedule) && !enabled;

  const log = (...args: any[]) => console.log('[Reminder]', ...args);

  const scheduleEnabled = async (reminderAt: Date) => {
    log('scheduling start', { taskId, at: reminderAt.toISOString(), platform: isNative ? 'native' : 'web' });

    try {
      if (isNative) {
        if (!hasNativePermission) {
          log('native permission missing -> requesting');
          const granted = await requestNativePermissions();
          log('native permission result', granted);
          if (!granted) throw new Error('native_permission_denied');
        }

        const success = await scheduleNotification({
          id: taskIdToNumericId(taskId),
          title: 'Focus On',
          body: `Te acompaño con esto: ${taskText}`,
          scheduleAt: reminderAt,
          extra: { taskId },
        });

        if (!success) throw new Error('native_schedule_failed');
      } else {
        const deviceId = getDeviceId();
        const { error } = await supabase.functions.invoke('save-reminder', {
          body: { deviceId, taskId, taskText, runAt: reminderAt.toISOString() },
        });
        if (error) throw error;
      }

      localStorage.setItem(getReminderStorageKey(taskId), reminderAt.toISOString());
      log('scheduled ok');
      toast.success('Listo. Te avisaré a tiempo.');
      return true;
    } catch (err) {
      console.error('[Reminder] schedule error', err);
      toast.error('No pude programarlo. Reintenta.');
      return false;
    }
  };

  const cancelEnabled = async () => {
    log('cancel start', { taskId, platform: isNative ? 'native' : 'web' });

    try {
      if (isNative) {
        await cancelNotificationByTaskId(taskId);
      } else {
        const deviceId = getDeviceId();
        await supabase.functions.invoke('delete-reminder', { body: { deviceId, taskId } });
      }
      localStorage.removeItem(getReminderStorageKey(taskId));
      log('cancel ok');
      toast('Recordatorio desactivado');
      return true;
    } catch (err) {
      console.error('[Reminder] cancel error', err);
      localStorage.removeItem(getReminderStorageKey(taskId));
      toast('Recordatorio desactivado');
      return true;
    }
  };

  const handlePermissionModalActivate = async () => {
    log('permission modal: ACTIVATE action triggered');

    // If auth is missing (or guest), we must route to login (push requires an account)
    if (isGuestMode() || !isAuthenticated) {
      setEnabled(false);
      pendingScheduleRef.current = null;
      toast('Inicia sesión para activar recordatorios');
      navigate('/auth');
      return;
    }

    try {
      // IMPORTANT: do NOT defer. Permission prompts require a direct user gesture on mobile browsers.
      const ok = isNative ? await requestNativePermissions() : await subscribeWebPush();
      log('permission/subscription result', ok);

      if (!ok) {
        // Revert UI
        setEnabled(false);
        pendingScheduleRef.current = null;
        toast('Recordatorios desactivados');
        return;
      }

      const pendingAt = pendingScheduleRef.current;
      pendingScheduleRef.current = null;
      if (!pendingAt) {
        // Nothing pending, just keep OFF
        setEnabled(false);
        return;
      }

      setStatus('loading');
      const success = await scheduleEnabled(pendingAt);
      setStatus('idle');
      if (!success) setEnabled(false);
    } catch (err) {
      console.error('[Reminder] permission flow error', err);
      setEnabled(false);
      pendingScheduleRef.current = null;
      toast.error('No pude programarlo. Reintenta.');
    }
  };

  const handlePermissionModalDismiss = () => {
    log('permission modal: DISMISS action triggered - reverting to OFF');
    // CRITICAL: Revert the optimistic toggle since user declined
    setEnabled(false);
    pendingScheduleRef.current = null;
    // No toast needed - silent dismiss
  };

  const handleReminderToggle = (desired: boolean) => {
    log('toggle clicked', { taskId, desired });

    // If user tries to enable reminders without an account, route to login immediately.
    if (desired && (isGuestMode() || !isAuthenticated)) {
      toast('Inicia sesión para activar recordatorios');
      navigate('/auth');
      return;
    }

    // Always immediate, visible action: flip UI instantly
    setEnabled(desired);

    // Defer all heavy work to next tick to avoid DOM removeChild crashes with overlays
    setTimeout(async () => {
      try {
        if (!desired) {
          setStatus('loading');
          await cancelEnabled();
          setStatus('idle');
          return;
        }

        // A) Validate datetime
        if (hasMissingSchedule || !hasValidTime) {
          log('datetime invalid', { scheduledDate, scheduledTime });
          setEnabled(false);

          // Calm autofix proposal
          const next = proposeNextValidTime();
          if (onScheduleUpdate) {
            onScheduleUpdate(next.date, next.time);
          }
          toast('Elige una hora futura para poder recordarte.');
          toast('Te lo programo para la próxima hora disponible.');

          // We *do not* schedule yet because task might not be updated in parent (unless callback)
          return;
        }

        // B) Permissions
        if (isNative) {
          const nativePermission = hasNativePermission ? 'granted' : 'default';
          log('permission', nativePermission);

          if (nativePermission !== 'granted') {
            // Show our modal first (request)
            pendingScheduleRef.current = calculateReminderTime(scheduledDate, scheduledTime);
            setPermissionModal({ open: true, variant: 'request' });
            return;
          }
        } else {
          if (!canUseWeb) {
            log('web not supported');
            setEnabled(false);
            toast('Este dispositivo no permite recordatorios aquí.');
            return;
          }

          log('permission', webPushPermission);

          if (webPushPermission === 'denied') {
            setEnabled(false);
            setPermissionModal({ open: true, variant: 'denied' });
            return;
          }

          // default OR not yet subscribed => show our modal first
          if (webPushPermission !== 'granted' || !isWebPushSubscribed) {
            pendingScheduleRef.current = calculateReminderTime(scheduledDate, scheduledTime);
            setPermissionModal({ open: true, variant: 'request' });
            return;
          }
        }

        // C) Schedule
        const reminderAt = calculateReminderTime(scheduledDate, scheduledTime);
        if (!reminderAt) {
          log('calculate time failed');
          setEnabled(false);
          toast('Elige una hora futura para poder recordarte.');
          return;
        }

        setStatus('loading');
        const ok = await scheduleEnabled(reminderAt);
        setStatus('idle');
        if (!ok) setEnabled(false);
      } catch (err) {
        console.error('[Reminder] toggle flow error', err);
        setStatus('idle');
        setEnabled(false);
        toast.error('No pude programarlo. Reintenta.');
      }
    }, 0);
  };

  const showLoginPrompt = isGuestMode() || !isAuthenticated;

  if (!canUseWeb) return null;

  return (
    <>
      {/* Stable container: never conditionally unmount */}
      <div className="mt-3 pt-3 border-t border-border/30">
        {showLoginPrompt ? (
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Bell size={14} className="opacity-70" />
            <span>Inicia sesión para activar recordatorios</span>
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {enabled ? (
                  <Bell size={14} className="text-primary" />
                ) : (
                  <BellOff size={14} className="text-muted-foreground" />
                )}
                <span className="text-sm text-foreground">Recordatorio</span>
                {status === 'loading' && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                {enabled && status !== 'loading' && <CheckCircle2 size={14} className="text-primary" />}
              </div>

              {/* NEVER disabled by permissions. Only during in-flight action. */}
              <Switch
                checked={enabled}
                onCheckedChange={handleReminderToggle}
                disabled={status === 'loading'}
                aria-label="Activar recordatorio"
              />
            </div>

            {/* Calm helper (no red banners) */}
            <div className={showTimeHelper ? 'block' : 'hidden'}>
              <p className="text-xs text-muted-foreground mt-1.5 ml-6">Elige una hora futura para poder recordarte.</p>
            </div>

            {enabled && scheduledTime ? (
              <p className="text-xs text-muted-foreground mt-1.5 ml-6">Te avisaré a las {scheduledTime}</p>
            ) : null}
          </>
        )}
      </div>

      {/* Always mounted */}
      <ReminderPermissionModal
        open={permissionModal.open}
        onOpenChange={(open) => setPermissionModal((p) => ({ ...p, open }))}
        variant={permissionModal.variant}
        onActivate={handlePermissionModalActivate}
        onDismiss={handlePermissionModalDismiss}
      />
    </>
  );
}
