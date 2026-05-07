import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEVICE_ID_KEY = 'focuson_device_id';
const NOTIF_FLAG_KEY = 'notifications_enabled';

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = (crypto as any)?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `dev-${Date.now()}`;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(() => {
    try { return localStorage.getItem(NOTIF_FLAG_KEY) === 'true'; } catch { return false; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (loading) return false;
    setLoading(true);
    try {
      if (!('Notification' in window)) throw new Error('Este navegador no soporta notificaciones.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (permission === 'denied') {
          throw new Error('Notificaciones bloqueadas. Actívalas en ajustes del navegador.');
        }
        throw new Error('Permiso no concedido.');
      }

      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from edge function
      const { data: cfg, error: cfgErr } = await supabase.functions.invoke('push-config');
      if (cfgErr || !cfg?.vapidPublicKey) {
        throw new Error('No se pudo obtener la configuración de notificaciones.');
      }

      // Reuse existing subscription if any
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
        });
      }

      const json = subscription.toJSON() as any;
      const endpoint = subscription.endpoint;
      const p256dh = json?.keys?.p256dh ?? arrayBufferToBase64(subscription.getKey('p256dh'));
      const auth = json?.keys?.auth ?? arrayBufferToBase64(subscription.getKey('auth'));
      const deviceId = getOrCreateDeviceId();

      const { error: saveErr } = await supabase.functions.invoke('save-push-subscription', {
        body: { deviceId, endpoint, p256dh, auth },
      });
      if (saveErr) throw new Error('No se pudo guardar la suscripción.');

      try { localStorage.setItem(NOTIF_FLAG_KEY, 'true'); } catch {}
      setIsSubscribed(true);
      return true;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { isSupported, isSubscribed, loading, subscribe };
}
