import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState, isGuestMode } from './useAuthState';

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

// Cache for VAPID key
let cachedVapidKey: string | null = null;

async function fetchVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  
  try {
    const { data, error } = await supabase.functions.invoke('push-config');
    if (error) {
      console.error('[WebPush] Error fetching VAPID key:', error);
      return null;
    }
    if (data?.vapidPublicKey) {
      cachedVapidKey = data.vapidPublicKey;
      console.log('[WebPush] VAPID key fetched successfully');
      return cachedVapidKey;
    }
    return null;
  } catch (err) {
    console.error('[WebPush] Failed to fetch VAPID key:', err);
    return null;
  }
}

export function useWebPushNotifications() {
  const { session, isAuthenticated } = useAuthState();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (err) {
      console.error('[WebPush] Error checking subscription:', err);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  };

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('[WebPush] Push notifications not supported');
      return false;
    }

    // Skip for guest mode
    if (isGuestMode()) {
      console.log('[WebPush] Push notifications not available in guest mode');
      return false;
    }

    if (!isAuthenticated || !session) {
      console.error('[WebPush] User not authenticated');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        console.log('[WebPush] Notification permission denied');
        return false;
      }

      // Fetch VAPID key from backend
      const vapidPublicKey = await fetchVapidPublicKey();
      if (!vapidPublicKey) {
        console.error('[WebPush] VAPID key not available');
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const json = subscription.toJSON();
      const deviceId = getOrCreateDeviceId();

      // Save to backend with auth token
      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          deviceId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth
        }
      });

      if (error) {
        console.error('[WebPush] Error saving subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      console.log('[WebPush] Push subscription saved successfully');
      return true;
    } catch (err) {
      console.error('[WebPush] Error subscribing to push:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, isAuthenticated, session]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('[WebPush] Error unsubscribing:', err);
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
    isAuthenticated
  };
}
