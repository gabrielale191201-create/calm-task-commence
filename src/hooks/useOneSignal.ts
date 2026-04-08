import { useCallback, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

const ONESIGNAL_APP_ID = 'e41d2628-7541-489a-be75-f969db33aa91';

declare global {
  interface Window {
    OneSignal?: any;
  }
}

let sdkLoaded = false;

function ensureOneSignalScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.OneSignal) { resolve(); return; }
    if (sdkLoaded) {
      // script added but not ready yet – poll
      const t = setInterval(() => { if (window.OneSignal) { clearInterval(t); resolve(); } }, 200);
      setTimeout(() => { clearInterval(t); reject(new Error('OneSignal script timeout')); }, 8000);
      return;
    }
    sdkLoaded = true;
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.async = true;
    s.onload = () => {
      const t = setInterval(() => { if (window.OneSignal) { clearInterval(t); resolve(); } }, 200);
      setTimeout(() => { clearInterval(t); reject(new Error('OneSignal not on window after load')); }, 8000);
    };
    s.onerror = () => reject(new Error('Failed to load OneSignal script'));
    document.head.appendChild(s);
  });
}

let initDone = false;

async function initOneSignal() {
  await ensureOneSignalScript();
  if (initDone) return;
  initDone = true;
  await window.OneSignal.init({
    appId: ONESIGNAL_APP_ID,
    allowLocalhostAsSecureOrigin: true,
  });
}

export function useOneSignal() {
  const { isAuthenticated, currentUserId } = useAuthState();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    initOneSignal()
      .then(() => {
        const granted = window.OneSignal?.Notifications?.permission;
        setPermissionGranted(!!granted);
      })
      .catch(err => console.warn('[OneSignal] init error:', err));
  }, []);

  const saveSubscriptionId = useCallback(async () => {
    if (!isAuthenticated || !currentUserId || savedRef.current) return;
    try {
      await initOneSignal();
      const subId = window.OneSignal?.User?.PushSubscription?.id;
      if (!subId) return;
      savedRef.current = true;
      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_id: subId } as any)
        .eq('user_id', currentUserId);
      if (error) { console.error('[OneSignal] save error:', error); savedRef.current = false; }
    } catch (err) { console.error('[OneSignal]', err); savedRef.current = false; }
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    if (permissionGranted && isAuthenticated && currentUserId) {
      setTimeout(() => saveSubscriptionId(), 1500);
    }
  }, [permissionGranted, isAuthenticated, currentUserId, saveSubscriptionId]);

  const requestPermission = useCallback(async () => {
    alert('1. Botón presionado, iniciando...');

    if (typeof window !== 'undefined' && window.OneSignal) {
      try {
        await window.OneSignal.Slidedown.promptPush({ force: true });
        const granted = window.OneSignal.Notifications.permission;
        setPermissionGranted(granted);
        if (granted) {
          alert('2. Permiso concedido');
          setTimeout(() => saveSubscriptionId(), 1500);
        }
      } catch (err: any) {
        alert('Fallo al abrir: ' + (err?.message || String(err)));
      }
    } else {
      alert('Error: OneSignal no está cargado en el window');
    }
  }, [saveSubscriptionId]);

  return { requestPermission, permissionGranted };
}
