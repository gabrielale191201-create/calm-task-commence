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
  if (cachedVapidKey) {
    console.log('[WebPush] Using cached VAPID key');
    return cachedVapidKey;
  }
  
  try {
    console.log('[WebPush] Fetching VAPID key from backend...');
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
    
    console.error('[WebPush] VAPID key not in response:', data);
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

  const log = (...args: unknown[]) => console.log('[WebPush]', ...args);

  // Check browser support and existing subscription
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 
        typeof window !== 'undefined' &&
        window.isSecureContext &&
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window;
      
      log('Browser support check:', {
        isSecureContext: window.isSecureContext,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
        hasNotification: 'Notification' in window,
        supported
      });
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        await checkExistingSubscription();
      }
    };
    
    checkSupport();
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await (registration as any).pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        log('Existing subscription check:', subscription ? 'found' : 'none');
      }
    } catch (err) {
      log('Error checking subscription:', err);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    log('Registering service worker...');
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    log('SW registered, waiting for ready...');
    await navigator.serviceWorker.ready;
    log('SW ready');
    return registration;
  };

  const subscribe = useCallback(async (): Promise<boolean> => {
    log('Subscribe called');
    
    if (!isSupported) {
      log('Push notifications not supported');
      return false;
    }

    // Skip for guest mode
    if (isGuestMode()) {
      log('Push notifications not available in guest mode');
      return false;
    }

    if (!isAuthenticated || !session) {
      log('User not authenticated');
      return false;
    }

    setIsLoading(true);

    try {
      // Step 1: Request permission
      log('Requesting notification permission...');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      log('Permission result:', perm);
      
      if (perm !== 'granted') {
        log('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Step 2: Fetch VAPID key from backend
      log('Fetching VAPID key...');
      const vapidPublicKey = await fetchVapidPublicKey();
      if (!vapidPublicKey) {
        log('VAPID key not available');
        setIsLoading(false);
        return false;
      }

      // Step 3: Register service worker
      log('Getting/registering service worker...');
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await registerServiceWorker();
      } else {
        await navigator.serviceWorker.ready;
      }

      // Step 4: Check for existing subscription
      let subscription = await (registration as any).pushManager.getSubscription();
      
      // Step 5: Create new subscription if needed
      if (!subscription) {
        log('Creating new push subscription...');
        try {
          subscription = await (registration as any).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });
          log('Subscription created:', subscription.endpoint.substring(0, 50) + '...');
        } catch (subscribeError) {
          log('Subscribe error:', subscribeError);
          setIsLoading(false);
          return false;
        }
      } else {
        log('Using existing subscription');
      }

      // Step 6: Save to backend
      const json = subscription.toJSON();
      const deviceId = getOrCreateDeviceId();

      log('Saving subscription to backend...', { deviceId });
      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          deviceId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth
        }
      });

      if (error) {
        log('Error saving subscription:', error);
        setIsLoading(false);
        return false;
      }

      setIsSubscribed(true);
      log('Push subscription saved successfully');
      setIsLoading(false);
      return true;
    } catch (err) {
      log('Error in subscribe flow:', err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, isAuthenticated, session]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    log('Unsubscribe called');
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await (registration as any).pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          log('Unsubscribed successfully');
        }
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      log('Error unsubscribing:', err);
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
