import { useCallback, useState, useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

export function useOneSignal() {
  const { isAuthenticated, currentUserId } = useAuthState();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const savedRef = useRef(false);

  const saveSubscriptionId = useCallback(async () => {
    if (!isAuthenticated || !currentUserId || savedRef.current) return;
    try {
      const subId = OneSignal.User?.PushSubscription?.id;
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

  const requestPermission = useCallback(async () => {
    try {
      await OneSignal.Notifications.requestPermission();
      const granted = OneSignal.Notifications.permission;
      setPermissionGranted(granted);
      if (granted) {
        setTimeout(() => saveSubscriptionId(), 1500);
      }
    } catch (err) {
      console.error('[OneSignal] permission error:', err);
    }
  }, [saveSubscriptionId]);

  // Auto-save if already granted
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    const t = setTimeout(() => {
      if (OneSignal.Notifications?.permission) {
        setPermissionGranted(true);
        saveSubscriptionId();
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [isAuthenticated, currentUserId, saveSubscriptionId]);

  return { requestPermission, permissionGranted };
}
