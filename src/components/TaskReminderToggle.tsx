import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState, isGuestMode } from '@/hooks/useAuthState';
import { parseDateString } from '@/lib/dateUtils';

interface TaskReminderToggleProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

const DEVICE_ID_KEY = 'focuson_device_id';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

function isValidVapidKey(key: string): boolean {
  if (!key || key.length < 20) return false;
  // VAPID public keys are typically 87 characters in base64url
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return base64urlRegex.test(key);
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
  const { isAuthenticated, session } = useAuthState();
  const [state, setState] = useState<ReminderState>({ status: 'idle' });
  
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
  if (!isAuthenticated || !session) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={14} className="opacity-50" />
          <span>Inicia sesión para activar recordatorios</span>
        </div>
      </div>
    );
  }

  // Check VAPID key availability
  const vapidAvailable = isValidVapidKey(VAPID_PUBLIC_KEY);

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
      // Step 1: Check VAPID key
      if (!vapidAvailable) {
        throw new Error('VAPID_CONFIG_MISSING|La configuración de notificaciones no está disponible. Contacta al administrador.');
      }

      // Step 2: Check browser support
      if (!('serviceWorker' in navigator)) {
        throw new Error('SW_NOT_SUPPORTED|Tu navegador no soporta Service Workers');
      }
      if (!('PushManager' in window)) {
        throw new Error('PUSH_NOT_SUPPORTED|Tu navegador no soporta notificaciones push');
      }
      if (!('Notification' in window)) {
        throw new Error('NOTIF_NOT_SUPPORTED|Tu navegador no soporta notificaciones');
      }

      // Step 3: Request notification permission
      console.log('[Reminder] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[Reminder] Permission result:', permission);
      
      if (permission !== 'granted') {
        throw new Error('PERMISSION_DENIED|Necesitas permitir las notificaciones para recibir recordatorios');
      }

      // Step 4: Register service worker
      console.log('[Reminder] Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      console.log('[Reminder] Service worker ready, scope:', registration.scope);

      // Step 5: Subscribe to push
      console.log('[Reminder] Subscribing to push...');
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
          console.log('[Reminder] New subscription created');
        } catch (subscribeError: any) {
          console.error('[Reminder] Subscribe error:', subscribeError);
          throw new Error(`SUBSCRIBE_FAILED|Error al suscribirse: ${subscribeError.name} - ${subscribeError.message}`);
        }
      } else {
        console.log('[Reminder] Using existing subscription');
      }

      const subscriptionJson = subscription.toJSON();
      const deviceId = getOrCreateDeviceId();

      // Step 6: Save subscription to database
      console.log('[Reminder] Saving subscription to database...');
      const { error: subError } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          deviceId,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth
        }
      });

      if (subError) {
        console.error('[Reminder] Save subscription error:', subError);
        throw new Error(`SAVE_SUB_FAILED|Error al guardar suscripción: ${subError.message}`);
      }
      console.log('[Reminder] Subscription saved successfully');

      // Step 7: Calculate reminder time
      const reminderTime = calculateReminderTime();
      if (!reminderTime) {
        throw new Error('INVALID_TIME|No se pudo calcular la hora del recordatorio');
      }

      // Check if reminder time is in the future
      if (reminderTime <= new Date()) {
        throw new Error('TIME_PASSED|La hora programada ya pasó');
      }

      // Step 8: Save reminder
      console.log('[Reminder] Saving reminder for:', reminderTime.toISOString());
      const { error: reminderError } = await supabase.functions.invoke('save-reminder', {
        body: {
          deviceId,
          taskId,
          taskText,
          runAt: reminderTime.toISOString()
        }
      });

      if (reminderError) {
        console.error('[Reminder] Save reminder error:', reminderError);
        throw new Error(`SAVE_REMINDER_FAILED|Error al guardar recordatorio: ${reminderError.message}`);
      }

      // Success - save to localStorage
      localStorage.setItem(getReminderStorageKey(taskId), reminderTime.toISOString());
      setState({ status: 'enabled' });
      console.log('[Reminder] Reminder enabled successfully!');

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
      const deviceId = getOrCreateDeviceId();
      
      const { error } = await supabase.functions.invoke('delete-reminder', {
        body: { deviceId, taskId }
      });

      if (error) {
        console.error('[Reminder] Delete error:', error);
        // Still remove from localStorage even if server fails
      }

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
