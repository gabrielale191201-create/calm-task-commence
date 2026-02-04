import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Clock, AlertCircle, LogIn } from 'lucide-react';
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

export function TaskReminderToggle({ taskId, taskText, scheduledDate, scheduledTime }: TaskReminderToggleProps) {
  const { isGuest } = useGuestMode();
  const { session, isAuthenticated } = useAuthState();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'datetime' | 'ready'>('idle');

  // Check browser support
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

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

  // Handle toggle - robust step-by-step validation
  const handleToggle = useCallback(async (checked: boolean) => {
    if (!checked) {
      // Turning off - reset state
      setIsEnabled(false);
      setStep('idle');
      setReminderDateTime('');
      console.log('[Reminder] Toggle OFF - estado reseteado');
      return;
    }

    console.log('[Reminder] Toggle ON - iniciando validaciones...');

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
        console.error('[Reminder] Error solicitando permiso:', err);
        toast.error('Error al solicitar permisos de notificación.');
        setIsLoading(false);
        return;
      }
    }
    console.log('[Reminder] ✓ Permiso de notificaciones concedido');

    // Enable and show datetime picker - DON'T schedule yet
    setIsEnabled(true);
    setStep('datetime');
    setIsLoading(false);
    console.log('[Reminder] ✓ Mostrando selector de fecha/hora');
  }, [isSupported]);

  // Schedule the reminder (called when user clicks "Programar")
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
      // STEP 3: Verify/register Service Worker
      console.log('[Reminder] Verificando Service Worker...');
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.ready;
        console.log('[Reminder] ✓ Service Worker activo:', registration.active?.state);
      } catch (swError) {
        console.error('[Reminder] Error con Service Worker:', swError);
        toast.error('No se pudo activar el servicio de notificaciones. Recarga e intenta.');
        setIsEnabled(false);
        setStep('idle');
        setIsLoading(false);
        return;
      }

      // STEP 4: Create/get push subscription
      console.log('[Reminder] Verificando suscripción push...');
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('[Reminder] Creando nueva suscripción push...');
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
          console.log('[Reminder] ✓ Suscripción creada');
        } catch (subError: any) {
          console.error('[Reminder] Error creando suscripción:', subError);
          if (subError.name === 'NotAllowedError') {
            toast.error('Permiso de notificaciones denegado por el navegador.');
          } else if (subError.name === 'AbortError') {
            toast.error('Suscripción cancelada. Intenta de nuevo.');
          } else {
            toast.error(`Error al suscribirse: ${subError.message || 'Error desconocido'}`);
          }
          setIsEnabled(false);
          setStep('idle');
          setIsLoading(false);
          return;
        }
      }
      console.log('[Reminder] ✓ Suscripción push activa');

      // STEP 5: Save subscription to database (if needed)
      const json = subscription.toJSON();
      const deviceId = getOrCreateDeviceId();
      
      console.log('[Reminder] Guardando suscripción en BD...');
      const { error: subSaveError } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          deviceId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth
        }
      });

      if (subSaveError) {
        console.error('[Reminder] Error guardando suscripción:', subSaveError);
        // Continue anyway - subscription might already exist
        console.log('[Reminder] Continuando (suscripción podría ya existir)...');
      } else {
        console.log('[Reminder] ✓ Suscripción guardada en BD');
      }

      // STEP 6: Save reminder to database
      console.log('[Reminder] Guardando recordatorio en BD...');
      const { error: reminderError } = await supabase.functions.invoke('save-reminder', {
        body: {
          deviceId,
          taskId,
          taskText,
          runAt: runAt.toISOString()
        }
      });

      if (reminderError) {
        console.error('[Reminder] Error guardando recordatorio:', reminderError);
        
        // Parse specific errors
        if (reminderError.message?.includes('401') || reminderError.message?.includes('Unauthorized')) {
          toast.error('Sesión expirada. Vuelve a iniciar sesión.');
        } else if (reminderError.message?.includes('400')) {
          toast.error('Datos inválidos. Verifica la fecha y hora.');
        } else {
          toast.error('No se pudo guardar el recordatorio. Intenta de nuevo.');
        }
        
        setIsEnabled(false);
        setStep('idle');
        setIsLoading(false);
        return;
      }

      // SUCCESS!
      console.log('[Reminder] ✓ Recordatorio guardado exitosamente');
      setStep('ready');
      toast.success(`Recordatorio: ${runAt.toLocaleDateString('es-ES', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })}`);
      
    } catch (error: any) {
      console.error('[Reminder] Error inesperado:', error);
      toast.error(`Error: ${error.message || 'Error desconocido'}`);
      setIsEnabled(false);
      setStep('idle');
    } finally {
      setIsLoading(false);
    }
  }, [reminderDateTime, taskId, taskText]);

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
      {Notification.permission === 'denied' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle size={12} />
          <span>Notificaciones bloqueadas en el navegador</span>
        </div>
      )}
    </div>
  );
}
