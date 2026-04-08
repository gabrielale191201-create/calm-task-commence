import { useCallback, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

// OneSignal Cordova plugin exposes a global `OneSignalPlugin` / `cordova.plugins.OneSignal`
// We access it via the window global that the cordova plugin registers.
function getOneSignal(): any {
  return (window as any).plugins?.OneSignal ?? (window as any).OneSignal;
}

const ONESIGNAL_APP_ID = 'e41d2628-7541-489a-be75-f969db33aa91';

export function useOneSignal() {
  const { isAuthenticated, currentUserId } = useAuthState();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const savedRef = useRef(false);
  const initRef = useRef(false);

  // Save subscription ID to Supabase
  const saveSubscriptionId = useCallback(async (subId?: string) => {
    if (!isAuthenticated || !currentUserId || savedRef.current) return;
    try {
      const os = getOneSignal();
      const id = subId || os?.User?.pushSubscription?.id;
      if (!id) return;
      savedRef.current = true;
      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_id: id } as any)
        .eq('user_id', currentUserId);
      if (error) {
        console.error('[OneSignal] save error:', error);
        savedRef.current = false;
      }
    } catch (err) {
      console.error('[OneSignal]', err);
      savedRef.current = false;
    }
  }, [isAuthenticated, currentUserId]);

  // Initialize native OneSignal SDK
  useEffect(() => {
    if (initRef.current) return;

    const init = () => {
      const os = getOneSignal();
      if (!os) {
        console.warn('[OneSignal] Native plugin not available (web context?)');
        return;
      }
      initRef.current = true;

      // Initialize with App ID
      os.initialize(ONESIGNAL_APP_ID);

      // Listen for subscription changes to capture the ID
      try {
        os.User?.pushSubscription?.addEventListener?.('change', (event: any) => {
          console.log('[OneSignal] subscription change:', event);
          const id = event?.current?.id;
          if (id) {
            setPermissionGranted(true);
            saveSubscriptionId(id);
          }
        });
      } catch {
        // Some versions don't support addEventListener
      }

      // Check if already has permission
      const hasPermission = os.Notifications?.permission ?? false;
      if (hasPermission) {
        setPermissionGranted(true);
        setTimeout(() => saveSubscriptionId(), 1500);
      }
    };

    // Wait for deviceready in Capacitor/Cordova context
    if ((window as any).Capacitor || document.URL.startsWith('http://localhost')) {
      document.addEventListener('deviceready', init, false);
      // Also try immediately in case deviceready already fired
      setTimeout(init, 1000);
    } else {
      // Fallback: try after a delay
      setTimeout(init, 2000);
    }
  }, [saveSubscriptionId]);

  // Request native permission
  const requestPermission = useCallback(async () => {
    try {
      const os = getOneSignal();
      if (!os) {
        console.warn('[OneSignal] Plugin not available');
        return;
      }
      const accepted = await os.Notifications.requestPermission(true);
      setPermissionGranted(!!accepted);
      if (accepted) {
        setTimeout(() => saveSubscriptionId(), 1500);
      }
    } catch (err) {
      console.error('[OneSignal] permission error:', err);
    }
  }, [saveSubscriptionId]);

  // Auto-request permission after auth
  useEffect(() => {
    if (!isAuthenticated || !currentUserId || permissionGranted) return;
    const t = setTimeout(() => {
      requestPermission();
    }, 3000);
    return () => clearTimeout(t);
  }, [isAuthenticated, currentUserId, permissionGranted, requestPermission]);

  return { requestPermission, permissionGranted };
}
