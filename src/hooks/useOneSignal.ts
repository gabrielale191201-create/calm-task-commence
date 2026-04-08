import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

declare global {
  interface Window {
    OneSignal?: any;
  }
}

/**
 * Hook that listens for OneSignal subscription changes
 * and saves the onesignal_id to the user's profile.
 * OneSignal itself is initialized via a <script> tag in index.html.
 */
export function useOneSignal() {
  const { isAuthenticated, currentUserId } = useAuthState();
  const savedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId || savedRef.current) return;

    const save = async () => {
      try {
        const os = window.OneSignal;
        if (!os) return;
        const subId = os.User?.PushSubscription?.id;
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
      }
    };

    // Try after a delay to let OneSignal settle
    const timer = setTimeout(save, 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, currentUserId]);
}
