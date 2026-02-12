import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, CheckCircle2, XCircle, Loader2, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticState {
  isSecureContext: boolean;
  notificationPermission: NotificationPermission;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerScope: string | null;
  serviceWorkerReady: boolean;
  pushManagerSupported: boolean;
  pushSubscription: PushSubscription | null;
  vapidKeyAvailable: boolean;
  vapidKey: string | null;
  userAuthenticated: boolean;
  userId: string | null;
  errors: string[];
}

const DEVICE_ID_KEY = 'focuson_device_id';

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

export function PushDiagnostics() {
  const [state, setState] = useState<DiagnosticState>({
    isSecureContext: false,
    notificationPermission: 'default',
    serviceWorkerSupported: false,
    serviceWorkerRegistered: false,
    serviceWorkerScope: null,
    serviceWorkerReady: false,
    pushManagerSupported: false,
    pushSubscription: null,
    vapidKeyAvailable: false,
    vapidKey: null,
    userAuthenticated: false,
    userId: null,
    errors: [],
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const log = (...args: unknown[]) => console.log('[PushDiagnostics]', ...args);

  const runDiagnostics = useCallback(async () => {
    log('Running diagnostics...');
    setIsLoading(true);
    const errors: string[] = [];
    
    const newState: Partial<DiagnosticState> = {
      isSecureContext: window.isSecureContext,
      notificationPermission: 'Notification' in window ? Notification.permission : 'denied',
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      errors: [],
    };

    if (!newState.isSecureContext) {
      errors.push('No es un contexto seguro (HTTPS requerido)');
    }

    if (!newState.serviceWorkerSupported) {
      errors.push('Service Worker no soportado en este navegador');
    }

    if (!newState.pushManagerSupported) {
      errors.push('Push Manager no soportado en este navegador');
    }

    // Check auth
    try {
      const { data: { session } } = await supabase.auth.getSession();
      newState.userAuthenticated = !!session?.user;
      newState.userId = session?.user?.id || null;
      log('Auth check:', newState.userAuthenticated ? 'authenticated' : 'not authenticated');
    } catch (e) {
      errors.push('Error verificando autenticación');
      log('Auth error:', e);
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        newState.serviceWorkerRegistered = !!registration;
        newState.serviceWorkerScope = registration?.scope || null;
        log('SW registration:', registration ? 'found' : 'not found', registration?.scope);
        
        if (registration) {
          const ready = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise(resolve => setTimeout(() => resolve(null), 3000))
          ]);
          newState.serviceWorkerReady = !!ready;
          log('SW ready:', !!ready);
          
          // Check push subscription
          if ((registration as any).pushManager) {
            const subscription = await (registration as any).pushManager.getSubscription();
            newState.pushSubscription = subscription;
            log('Push subscription:', subscription ? 'exists' : 'none');
          }
        }
      } catch (e) {
        errors.push(`Error SW: ${e instanceof Error ? e.message : 'desconocido'}`);
        log('SW error:', e);
      }
    }

    // Check VAPID key
    try {
      log('Fetching VAPID key...');
      const { data, error } = await supabase.functions.invoke('push-config');
      if (error) {
        errors.push(`Error VAPID: ${error.message}`);
        log('VAPID fetch error:', error);
      } else if (data?.vapidPublicKey) {
        newState.vapidKeyAvailable = true;
        newState.vapidKey = data.vapidPublicKey;
        log('VAPID key available');
      } else {
        errors.push('VAPID key no disponible');
        log('VAPID key not in response');
      }
    } catch (e) {
      errors.push(`Error VAPID: ${e instanceof Error ? e.message : 'desconocido'}`);
      log('VAPID error:', e);
    }

    newState.errors = errors;
    setState(prev => ({ ...prev, ...newState }));
    setIsLoading(false);
    log('Diagnostics complete:', newState);
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const handleRequestPermission = async () => {
    log('Requesting notification permission...');
    try {
      const result = await Notification.requestPermission();
      log('Permission result:', result);
      setState(prev => ({ ...prev, notificationPermission: result }));
      
      if (result === 'granted') {
        toast.success('Permisos de notificación activados');
      } else if (result === 'denied') {
        toast.error('Permisos denegados. Actívalos en ajustes del navegador.');
      }
    } catch (e) {
      log('Permission error:', e);
      toast.error('Error solicitando permisos');
    }
  };

  const handleRegisterSW = async () => {
    log('Registering service worker...');
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      log('SW registered:', registration.scope);
      toast.success('Service Worker registrado');
      runDiagnostics();
    } catch (e) {
      log('SW registration error:', e);
      toast.error(`Error registrando SW: ${e instanceof Error ? e.message : 'desconocido'}`);
    }
  };

  const handleSubscribe = async () => {
    log('Starting subscription flow...');
    setIsSubscribing(true);
    
    try {
      // 1. Check permission
      if (state.notificationPermission !== 'granted') {
        log('Permission not granted, requesting...');
        const result = await Notification.requestPermission();
        setState(prev => ({ ...prev, notificationPermission: result }));
        if (result !== 'granted') {
          toast.error('Necesitas permitir las notificaciones');
          setIsSubscribing(false);
          return;
        }
      }

      // 2. Ensure SW registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        log('No SW, registering...');
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
      }
      log('SW ready');

      // 3. Get VAPID key
      if (!state.vapidKey) {
        toast.error('VAPID key no disponible');
        setIsSubscribing(false);
        return;
      }

      // 4. Subscribe to push
      log('Subscribing to push...');
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(state.vapidKey),
      });
      log('Push subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // 5. Save to backend
      const json = subscription.toJSON();
      const deviceId = getOrCreateDeviceId();
      
      log('Saving subscription to backend...');
      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          deviceId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
      });

      if (error) {
        log('Save error:', error);
        toast.error(`Error guardando suscripción: ${error.message}`);
        setIsSubscribing(false);
        return;
      }

      log('Subscription saved successfully');
      toast.success('¡Recordatorios activados!');
      runDiagnostics();
    } catch (e) {
      log('Subscribe error:', e);
      toast.error(`Error: ${e instanceof Error ? e.message : 'desconocido'}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendTest = async () => {
    log('Sending test notification...');
    setIsSendingTest(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-push', {
        body: {
          title: 'Focus On',
          body: '¡Notificación de prueba! Si ves esto, los recordatorios funcionan.',
        },
      });

      if (error) {
        log('Test push error:', error);
        toast.error(`Error: ${error.message}`);
      } else if (data?.error) {
        log('Test push backend error:', data);
        toast.error(`Error: ${data.error}`);
      } else {
        log('Test push sent:', data);
        toast.success('Notificación enviada. Debería llegar en segundos.');
      }
    } catch (e) {
      log('Test push exception:', e);
      toast.error(`Error: ${e instanceof Error ? e.message : 'desconocido'}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleUnsubscribe = async () => {
    log('Unsubscribing...');
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await (registration as any).pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          log('Unsubscribed');
          toast.success('Suscripción eliminada');
          runDiagnostics();
        }
      }
    } catch (e) {
      log('Unsubscribe error:', e);
      toast.error('Error al desuscribir');
    }
  };

  const StatusIcon = ({ ok }: { ok: boolean }) => 
    ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />;

  const isFullyReady = 
    state.isSecureContext &&
    state.notificationPermission === 'granted' &&
    state.serviceWorkerReady &&
    state.pushSubscription !== null &&
    state.vapidKeyAvailable &&
    state.userAuthenticated;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isFullyReady ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            Diagnóstico de Recordatorios
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={runDiagnostics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {isFullyReady ? (
          <Badge variant="default" className="w-fit bg-primary">
            ✓ Recordatorios Activados
          </Badge>
        ) : (
          <Badge variant="secondary" className="w-fit">
            Configuración incompleta
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <StatusIcon ok={state.isSecureContext} />
            <span>HTTPS</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon ok={state.notificationPermission === 'granted'} />
            <span>Permisos: {state.notificationPermission}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon ok={state.serviceWorkerReady} />
            <span>Service Worker</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon ok={!!state.pushSubscription} />
            <span>Suscripción Push</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon ok={state.vapidKeyAvailable} />
            <span>VAPID Key</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon ok={state.userAuthenticated} />
            <span>Autenticado</span>
          </div>
        </div>

        {/* Errors */}
        {state.errors.length > 0 && (
          <div className="bg-destructive/10 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Errores detectados
            </div>
            {state.errors.map((err, i) => (
              <p key={i} className="text-xs text-destructive/80 ml-6">• {err}</p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {state.notificationPermission !== 'granted' && (
            <Button 
              className="w-full" 
              onClick={handleRequestPermission}
              variant="outline"
            >
              <Bell className="h-4 w-4 mr-2" />
              Pedir permiso de notificaciones
            </Button>
          )}

          {!state.serviceWorkerReady && state.serviceWorkerSupported && (
            <Button 
              className="w-full" 
              onClick={handleRegisterSW}
              variant="outline"
            >
              Registrar Service Worker
            </Button>
          )}

          {!state.pushSubscription && state.serviceWorkerReady && state.vapidKeyAvailable && (
            <Button 
              className="w-full" 
              onClick={handleSubscribe}
              disabled={isSubscribing || !state.userAuthenticated}
            >
              {isSubscribing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Activar Recordatorios
            </Button>
          )}

          {state.pushSubscription && (
            <>
              <Button 
                className="w-full" 
                onClick={handleSendTest}
                disabled={isSendingTest || !state.userAuthenticated}
              >
                {isSendingTest ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar notificación de prueba
              </Button>
              
              <Button 
                className="w-full" 
                onClick={handleUnsubscribe}
                variant="ghost"
                size="sm"
              >
                Desactivar recordatorios
              </Button>
            </>
          )}

          {!state.userAuthenticated && (
            <p className="text-xs text-muted-foreground text-center">
              Inicia sesión para activar recordatorios
            </p>
          )}
        </div>

        {/* Debug info (collapsed by default in production) */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Info técnica</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-auto max-h-32">
{`SW Scope: ${state.serviceWorkerScope || 'N/A'}
VAPID: ${state.vapidKey ? state.vapidKey.substring(0, 20) + '...' : 'N/A'}
User ID: ${state.userId ? state.userId.substring(0, 8) + '...' : 'N/A'}
Subscription: ${state.pushSubscription ? 'Yes' : 'No'}
Endpoint: ${state.pushSubscription?.endpoint?.substring(0, 40) || 'N/A'}...`}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
