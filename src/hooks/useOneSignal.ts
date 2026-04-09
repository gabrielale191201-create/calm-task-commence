import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

/**
 * Initialises OneSignal Web Push and, once the user is authenticated
 * and subscribed, saves the OneSignal subscription ID to their profile.
 */
export function useOneSignal() {
  const { isAuthenticated, currentUserId } = useAuthState();
  const initedRef = useRef(false);

  // 1 — Initialise OneSignal (once per app lifetime)
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    OneSignal.init({
      appId: '52a6f5c7-05ef-4284-b0fd-93cad0533ebf',
      allowLocalhostAsSecureOrigin: true,
    })
      .then(() => {
        console.log('[OneSignal] SDK initialised');
        // Trigger the native / slidedown prompt
        OneSignal.Slidedown.promptPush();
      })
      .catch((err) => console.error('[OneSignal] init error', err));
  }, []);

  // 2 — Save subscription ID to profile when available
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;

    const saveSubId = async () => {
      try {
        // Small delay to let OneSignal settle after init
        await new Promise((r) => setTimeout(r, 4000));
        const subId = (OneSignal as any).User?.PushSubscription?.id;
        if (!subId) return;

        const { error } = await supabase
          .from('profiles')
          .update({ onesignal_id: subId } as any)
          .eq('user_id', currentUserId);

        if (error) console.error('[OneSignal] save error:', error);
        else console.log('[OneSignal] subscription ID saved:', subId);
      } catch (err) {
        console.error('[OneSignal]', err);
      }
    };

    saveSubId();
  }, [isAuthenticated, currentUserId]);
}
