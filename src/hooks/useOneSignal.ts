import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

export function useOneSignal() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    (OneSignal as any).isPushNotificationsEnabled?.().then(setIsSubscribed).catch(() => {});
  }, []);

  const subscribe = async (): Promise<boolean> => {
    try {
      await (OneSignal as any).showNativePrompt?.();
      const enabled = await (OneSignal as any).isPushNotificationsEnabled?.();
      setIsSubscribed(!!enabled);
      return !!enabled;
    } catch {
      return false;
    }
  };

  return { isSubscribed, subscribe };
}
