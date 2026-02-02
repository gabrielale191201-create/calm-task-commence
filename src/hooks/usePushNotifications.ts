import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

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
      console.error('Error checking subscription:', err);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  };

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('Push notifications not supported');
      return false;
    }

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const json = subscription.toJSON();
      const deviceId = getOrCreateDeviceId();

      // Save to backend
      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          deviceId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth
        }
      });

      if (error) {
        console.error('Error saving subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      console.log('Push subscription saved successfully');
      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      return false;
    }
  }, [isSupported]);

  const scheduleReminder = useCallback(async (taskId: string, taskText: string, runAt: Date): Promise<boolean> => {
    if (!isSubscribed) {
      // Try to subscribe first
      const subscribed = await subscribe();
      if (!subscribed) return false;
    }

    try {
      const deviceId = getOrCreateDeviceId();
      
      const { error } = await supabase.functions.invoke('save-reminder', {
        body: {
          deviceId,
          taskId,
          taskText,
          runAt: runAt.toISOString()
        }
      });

      if (error) {
        console.error('Error scheduling reminder:', error);
        return false;
      }

      console.log('Reminder scheduled for:', runAt.toISOString());
      return true;
    } catch (err) {
      console.error('Error scheduling reminder:', err);
      return false;
    }
  }, [isSubscribed, subscribe]);

  const cancelReminder = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const deviceId = getOrCreateDeviceId();
      
      const { error } = await supabase.functions.invoke('delete-reminder', {
        body: { deviceId, taskId }
      });

      if (error) {
        console.error('Error canceling reminder:', error);
        return false;
      }

      console.log('Reminder cancelled for task:', taskId);
      return true;
    } catch (err) {
      console.error('Error canceling reminder:', err);
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    scheduleReminder,
    cancelReminder
  };
}
