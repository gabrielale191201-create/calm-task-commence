import { supabase } from '@/integrations/supabase/client';

/**
 * Envía un evento de analítica de forma silenciosa y no bloqueante.
 * Registra si el usuario está autenticado. Invitados no generan tracking.
 */
export function trackUserEvent(
  eventName: string,
  metadata: Record<string, unknown> = {}
): void {
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_events').insert({
        user_id: user.id,
        event_name: eventName,
        metadata,
      } as any);
    } catch {
      // Silencioso: nunca interrumpe la experiencia
    }
  })();
}
