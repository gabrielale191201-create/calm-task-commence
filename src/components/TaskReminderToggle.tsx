import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Clock, AlertCircle, LogIn, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useAuthState } from '@/hooks/useAuthState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TaskReminderToggleProps {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

const DEVICE_ID_KEY = 'focuson_device_id';
const REMINDERS_STORAGE_KEY = 'focuson_active_reminders';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function formatUnknownError(err: unknown): { name: string; message: string } {
  if (err instanceof Error) {
    return { name: err.name || 'Error', message: err.message || 'Unknown error' };
  }
  try {
    return { name: 'Error', message: JSON.stringify(err) };
  } catch {
    return { name: 'Error', message: String(err) };
  }
}

function isProbablyValidVapidPublicKey(key: string): boolean {
  // WebPush expects a base64url-encoded 65-byte (uncompressed P-256) public key.
  // We can’t fully validate without decoding; this is a pragmatic guardrail.
  if (!key) return false;
  if (key.length < 80 || key.length > 120) return false;
  // base64url charset
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return false;
  return true;
}

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

// Local storage helpers for persisting reminder state
function getActiveReminders(): Record<string, string> {
  try {
    const stored = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveActiveReminder(taskId: string, dateTime: string) {
  const reminders = getActiveReminders();
  reminders[taskId] = dateTime;
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
}

function removeActiveReminder(taskId: string) {
  const reminders = getActiveReminders();
  delete reminders[taskId];
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
}

export function TaskReminderToggle({ taskId, taskText, scheduledDate, scheduledTime }: TaskReminderToggleProps) {
  const { isGuest } = useGuestMode();
  const { session, isAuthenticated } = useAuthState();
  
  // UI state - switch is OFF until reminder is successfully saved
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedDateTime, setSavedDateTime] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Check browser support
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  // Load persisted reminder state on mount
  useEffect(() => {
    const reminders = getActiveReminders();
    if (reminders[taskId]) {
      const savedTime = new Date(reminders[taskId]);
      // Only show as active if it's in the future
      if (savedTime > new Date()) {
        setSavedDateTime(reminders[taskId]);
      } else {
        removeActiveReminder(taskId);
      }
    }
  }, [taskId]);

  // Initialize datetime when opening picker
  useEffect(() => {
    if (showDatePicker && !reminderDateTime) {
      if (scheduledDate && scheduledTime) {
        setReminderDateTime(`${scheduledDate}T${scheduledTime}`);
      } else {
        const defaultTime = new Date(Date.now() + 30 * 60 * 1000);
        setReminderDateTime(defaultTime.toISOString().slice(0, 16));
      }
    }
  }, [showDatePicker, scheduledDate, scheduledTime, reminderDateTime]);

  // Computed state: switch is ON only if we have a saved reminder
  const isEnabled = savedDateTime !== null;

  // Handle toggle click
  const handleToggle = useCallback(async (checked: boolean) => {
    // Turning OFF - cancel reminder
    if (!checked && savedDateTime) {
      console.log('[Reminder] Desactivando recordatorio...');
      setIsLoading(true);
      
      try {
        setLastError(null);
        const deviceId = getOrCreateDeviceId();
        await supabase.functions.invoke('delete-reminder', {
          body: { deviceId, taskId }
        });
        
        removeActiveReminder(taskId);
        setSavedDateTime(null);
        setReminderDateTime('');
        setShowDatePicker(false);
        console.log('[Reminder] Recordatorio cancelado');
      } catch (err) {
        console.error('[Reminder] Error al cancelar:', err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Turning ON - show date picker (don't activate switch yet)
    if (checked && !savedDateTime) {
      console.log('[Reminder] Abriendo selector de fecha...');
      setLastError(null);
      
      // STEP 1: Check browser support
      if (!isSupported) {
        console.error('[Reminder] Navegador no soportado');
        toast.error('Tu navegador no soporta recordatorios. Usa Chrome o instala la PWA.');
        return;
      }
      console.log('[Reminder] ✓ Navegador soportado');

      // STEP 2: Check notification permission
      const currentPermission = Notification.permission;
      console.log('[Reminder] Permiso actual:', currentPermission);

      if (currentPermission === 'denied') {
        console.error('[Reminder] Permiso denegado');
        toast.error('Activa notificaciones en Configuración del sitio para recibir recordatorios.');
        return;
      }

      // Request permission if needed
      if (currentPermission === 'default') {
        console.log('[Reminder] Solicitando permiso...');
        setIsLoading(true);
        try {
          const permission = await Notification.requestPermission();
          console.log('[Reminder] Respuesta de permiso:', permission);
          
          if (permission !== 'granted') {
            toast.info('Necesitas permitir notificaciones para usar recordatorios.');
            setIsLoading(false);
            return;
          }
        } catch (err) {
          const e = formatUnknownError(err);
          console.error('[Reminder] Error solicitando permiso:', e);
          setLastError(`[Notification.requestPermission] ${e.name}: ${e.message}`);
          toast.error(`${e.name}: ${e.message}`);
          setIsLoading(false);
          return;
        } finally {
          setIsLoading(false);
        }
      }
      console.log('[Reminder] ✓ Permiso de notificaciones concedido');

      // Show date picker - switch stays OFF until save succeeds
      setShowDatePicker(true);
    }
  }, [isSupported, savedDateTime, taskId]);

  // Schedule the reminder - this is what actually turns the switch ON
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

    // Max 1 year in the future
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (runAt > maxDate) {
      toast.error('El recordatorio no puede ser más de un año en el futuro');
      return;
    }

    setIsLoading(true);
    console.log('[Reminder] Iniciando programación para:', runAt.toISOString());

    try {
      setLastError(null);

      // STEP 3: Verify/register Service Worker
      console.log('[Reminder] Verificando Service Worker...');
      let registration: ServiceWorkerRegistration;
      try {
        const ready = await navigator.serviceWorker.ready;
        registration = ready;
        const activeState = registration.active?.state;
        const scope = registration.scope;
        const scriptURL = registration.active?.scriptURL;
        console.log('[Reminder] ✓ Service Worker activo:', { activeState, scope, scriptURL });
        if (!scope || !scope.endsWith('/')) {
          console.warn('[Reminder] Service Worker scope inesperado:', scope);
        }
      } catch (swError) {
        const e = formatUnknownError(swError);
        console.error('[Reminder] Error con Service Worker:', e);
        setLastError(`[serviceWorker.ready] ${e.name}: ${e.message}`);
        toast.error(`${e.name}: ${e.message}`);
        setIsLoading(false);
        return;
      }

      // STEP 4: Create/get push subscription
      console.log('[Reminder] Verificando suscripción push...');
      let subscription: PushSubscription | null = null;
      try {
        subscription = await registration.pushManager.getSubscription();
        console.log('[Reminder] pushManager.getSubscription() =>', subscription ? 'EXISTS' : 'NULL');
      } catch (err) {
        const e = formatUnknownError(err);
        console.error('[Reminder] Error en getSubscription:', e);
        setLastError(`[pushManager.getSubscription] ${e.name}: ${e.message}`);
        toast.error(`${e.name}: ${e.message}`);
        setIsLoading(false);
        return;
      }
      
      if (!subscription) {
        console.log('[Reminder] Creando nueva suscripción push...');
        
        if (!VAPID_PUBLIC_KEY) {
          const msg = 'Falta VAPID_PUBLIC_KEY (configuración de push)';
          console.error('[Reminder] ' + msg);
          setLastError(msg);
          toast.error(msg);
          setIsLoading(false);
          return;
        }

        if (!isProbablyValidVapidPublicKey(VAPID_PUBLIC_KEY)) {
          const msg = 'VAPID_PUBLIC_KEY inválida (debe ser base64url)';
          console.error('[Reminder] ' + msg, { length: VAPID_PUBLIC_KEY.length });
          setLastError(msg);
          toast.error(msg);
          setIsLoading(false);
          return;
        }
        
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
          console.log('[Reminder] ✓ Suscripción creada');
        } catch (subError: any) {
          const e = formatUnknownError(subError);
          console.error('[Reminder] Error creando suscripción:', e);
          setLastError(`[pushManager.subscribe] ${e.name}: ${e.message}`);
          toast.error(`${e.name}: ${e.message}`);
          setIsLoading(false);
          return;
        }
      }
      console.log('[Reminder] ✓ Suscripción push activa');

      // STEP 5: Save subscription to database
      const json = subscription.toJSON();
      const deviceId = getOrCreateDeviceId();
      
      console.log('[Reminder] Guardando suscripción en BD...');
      const { data: subSaveData, error: subSaveError } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          deviceId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth
        }
      });

      if (subSaveError) {
        console.error('[Reminder] Error guardando suscripción:', subSaveError);
        setLastError(`[save-push-subscription] ${subSaveError.name}: ${subSaveError.message}`);
        
        // Check for auth errors
        const errorMsg = subSaveError.message || '';
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          toast.error('Sesión expirada. Vuelve a iniciar sesión.');
          setIsLoading(false);
          return;
        }
        // Non-fatal for other errors - subscription might already exist
        console.log('[Reminder] Continuando (suscripción podría ya existir)...');
      } else {
        console.log('[Reminder] ✓ Suscripción guardada en BD', subSaveData);
      }

      // STEP 6: Save reminder to database
      console.log('[Reminder] Guardando recordatorio en BD...');
      const { data: reminderData, error: reminderError } = await supabase.functions.invoke('save-reminder', {
        body: {
          deviceId,
          taskId,
          taskText: taskText.substring(0, 200), // Truncate for safety
          runAt: runAt.toISOString()
        }
      });

      if (reminderError) {
        console.error('[Reminder] Error guardando recordatorio:', reminderError);
        setLastError(`[save-reminder] ${reminderError.name}: ${reminderError.message}`);
        
        // Parse specific errors
        const errorMsg = reminderError.message || '';
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          toast.error('Sesión expirada. Vuelve a iniciar sesión.');
        } else if (errorMsg.includes('400')) {
          toast.error('Datos inválidos. Verifica la fecha y hora.');
        } else {
          toast.error(`${reminderError.name}: ${reminderError.message}`);
        }
        
        setIsLoading(false);
        return;
      }

      console.log('[Reminder] save-reminder OK:', reminderData);

      // SUCCESS! Now we can turn the switch ON
      console.log('[Reminder] ✓ Recordatorio guardado exitosamente');
      saveActiveReminder(taskId, reminderDateTime);
      setSavedDateTime(reminderDateTime);
      setShowDatePicker(false);
      
      toast.success(`Recordatorio: ${runAt.toLocaleDateString('es-ES', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })}`);
      
    } catch (error: any) {
      const e = formatUnknownError(error);
      console.error('[Reminder] Error inesperado:', e);
      setLastError(`[unexpected] ${e.name}: ${e.message}`);
      toast.error(`${e.name}: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [reminderDateTime, taskId, taskText]);

  // Cancel without saving
  const handleCancel = useCallback(() => {
    setShowDatePicker(false);
    setReminderDateTime('');
  }, []);

  // Guest mode - show login prompt
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

  // Not authenticated - show login prompt
  if (!isAuthenticated || !session) {
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

  // Not supported - show message
  if (!isSupported) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle size={14} />
          <span>Usa Chrome o instala la PWA para recordatorios</span>
        </div>
      </div>
    );
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
          {isEnabled && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check size={10} />
              Activo
            </span>
          )}
        </div>
        <Switch
          checked={isEnabled || showDatePicker}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
      </div>

      {/* Datetime picker - only show when picking date */}
      {showDatePicker && !savedDateTime && (
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
          
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 py-2.5 px-3 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSchedule}
              disabled={isLoading || !reminderDateTime}
              className="flex-1 py-2.5 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {isLoading ? 'Guardando...' : 'Guardar recordatorio'}
            </button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Recibirás una notificación aunque la app esté cerrada
          </p>

          {lastError ? (
            <div className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2">
              <div className="font-medium">Error técnico</div>
              <div className="break-words">{lastError}</div>
            </div>
          ) : null}

          {/* Debug action (internal): send immediate test push */}
          {window.location.search.includes('debugPush=1') ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                try {
                  setLastError(null);
                  console.log('[Reminder][Debug] Invocando test-push...');
                  const { data, error } = await supabase.functions.invoke('test-push', {
                    body: { title: 'Test Focus On', body: 'Notificación de prueba', taskId }
                  });
                  if (error) {
                    console.error('[Reminder][Debug] test-push error:', error);
                    setLastError(`[test-push] ${error.name}: ${error.message}`);
                    toast.error(`${error.name}: ${error.message}`);
                    return;
                  }
                  console.log('[Reminder][Debug] test-push OK:', data);
                  toast.success('Test push enviado (revisa notificación)');
                } catch (err) {
                  const e = formatUnknownError(err);
                  console.error('[Reminder][Debug] test-push unexpected:', e);
                  setLastError(`[test-push] ${e.name}: ${e.message}`);
                  toast.error(`${e.name}: ${e.message}`);
                }
              }}
              className="w-full py-2 px-3 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors"
            >
              Probar push inmediato (debug)
            </button>
          ) : null}
        </div>
      )}

      {/* Scheduled confirmation */}
      {savedDateTime && !showDatePicker && (
        <div className="mt-3 animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 p-2 rounded-lg">
            <Bell size={12} />
            <span>
              {new Date(savedDateTime).toLocaleDateString('es-ES', {
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
      {Notification.permission === 'denied' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle size={12} />
          <span>Notificaciones bloqueadas en el navegador</span>
        </div>
      )}
    </div>
  );
}
