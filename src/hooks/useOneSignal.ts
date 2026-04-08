import { useEffect, useRef, useCallback, useState } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

const ONESIGNAL_APP_ID = 'e41d2628-7541-489a-be75-f969db33aa91';

let initialized = false;

export function useOneSignal() {
  const { userId, isAuthenticated } = useAuthState();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const savedRef = useRef(false);

  // Initialize OneSignal once
  useEffect(() => {
    if (initialized) return;
    initialized = true;

    OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    }).catch((err) => {
      console.warn('[OneSignal] init error:', err);
    });
  }, []);

  // Save subscription ID to profile
  const saveSubscriptionId = useCallback(async () => {
    if (!isAuthenticated || !userId || savedRef.current) return;

    try {
      const subId = OneSignal.User?.PushSubscription?.id;
      if (!subId) return;

      savedRef.current = true;
      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_id: subId } as any)
        .eq('user_id', userId);

      if (error) {
        console.error('[OneSignal] Error saving subscription:', error);
        savedRef.current = false;
      }
    } catch (err) {
      console.error('[OneSignal] Error:', err);
      savedRef.current = false;
    }
  }, [isAuthenticated, userId]);

  // Request permission and capture subscription
  const requestPermission = useCallback(async () => {
    try {
      await OneSignal.Notifications.requestPermission();
      setPermissionGranted(OneSignal.Notifications.permission);

      // Wait a moment for subscription to propagate
      setTimeout(() => {
        saveSubscriptionId();
      }, 1500);
    } catch (err) {
      console.error('[OneSignal] Permission error:', err);
    }
  }, [saveSubscriptionId]);

  // Auto-save if permission already granted on load
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const checkExisting = setTimeout(() => {
      if (OneSignal.Notifications?.permission) {
        setPermissionGranted(true);
        saveSubscriptionId();
      }
    }, 2000);

    return () => clearTimeout(checkExisting);
  }, [isAuthenticated, userId, saveSubscriptionId]);

  return { requestPermission, permissionGranted };
}
