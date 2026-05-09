import { useEffect, useState } from 'react';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

export function useOneSignal() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      const enabled = await OneSignal.User.PushSubscription.optedIn;
      setIsSubscribed(enabled);
    });
  }, []);

  const subscribe = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.Notifications.requestPermission();
          await OneSignal.User.PushSubscription.optIn();
          const enabled = await OneSignal.User.PushSubscription.optedIn;
          setIsSubscribed(enabled);
          resolve(enabled);
        } catch {
          resolve(false);
        }
      });
    });
  };

  return { isSubscribed, subscribe };
}
