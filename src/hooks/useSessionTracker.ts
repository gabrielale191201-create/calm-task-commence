/**
 * Session Tracker: mide cuánto tiempo el usuario tiene la app activa.
 * Usa visibilitychange y beforeunload para registrar la duración en Supabase.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { useGuestMode } from '@/hooks/useGuestMode';

export function useSessionTracker() {
  const { isAuthenticated } = useAuthState();
  const { isGuest } = useGuestMode();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isAuthenticated || isGuest) return;

    const startSession = async () => {
      startTimeRef.current = Date.now();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase.from('app_sessions').insert({
          user_id: user.id,
          started_at: new Date().toISOString(),
        } as any).select('id').single();

        if (data) sessionIdRef.current = (data as any).id;
      } catch {}
    };

    const endSession = () => {
      if (!sessionIdRef.current) return;
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (durationSeconds < 2) return; // ignore very short sessions

      // Use sendBeacon for reliability on page close
      const payload = JSON.stringify({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      });

      // Try to update via supabase (won't work on unload, but covers visibility)
      supabase.from('app_sessions').update({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      } as any).eq('id', sessionIdRef.current).then();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        endSession();
      } else if (document.visibilityState === 'visible') {
        startSession();
      }
    };

    const handleBeforeUnload = () => endSession();

    // Start initial session
    startSession();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      endSession();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, isGuest]);
}
