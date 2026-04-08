import { useCallback, useState, useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

const ONESIGNAL_APP_ID = 'e41d2628-7541-489a-be75-f969db33aa91';

let initPromise: Promise<void> | null = null;

function initOneSignalOnce() {
  if (initPromise) return initPromise;
  initPromise = OneSignal.init({
    appId: ONESIGNAL_APP_ID,
    allowLocalhostAsSecureOrigin: true,
  });
  return initPromise;
}

export function useOneSignal() {
  const { isAuthenticated, currentUserId } = useAuthState();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const savedRef = useRef(false);

  // Initialize SDK once
  useEffect(() => {
    initOneSignalOnce().then(() => {
      const granted = OneSignal.Notifications.permission;
      setPermissionGranted(granted);
    }).catch(err => console.warn('[OneSignal] init error:', err));
  }, []);

  // Save subscription ID to Supabase
  const saveSubscriptionId = useCallback(async () => {
    if (!isAuthenticated || !currentUserId || savedRef.current) return;
    try {
      await initOneSignalOnce();
      const subId = OneSignal.User.PushSubscription.id;
      if (!subId) return;
      savedRef.current = true;
      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_id: subId } as any)
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

  // Auto-save when already granted
  useEffect(() => {
    if (permissionGranted && isAuthenticated && currentUserId) {
      setTimeout(() => saveSubscriptionId(), 1500);
    }
  }, [permissionGranted, isAuthenticated, currentUserId, saveSubscriptionId]);

  // Request permission via OneSignal prompt
  const requestPermission = useCallback(async () => {
    try {
      await initOneSignalOnce();
      await OneSignal.Slidedown.promptPush();
      // Check after prompt
      const granted = OneSignal.Notifications.permission;
      setPermissionGranted(granted);
      if (granted) {
        setTimeout(() => saveSubscriptionId(), 1500);
      }
    } catch (err) {
      console.error('[OneSignal] permission error:', err);
    }
  }, [saveSubscriptionId]);

  return { requestPermission, permissionGranted };
}
