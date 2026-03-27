import { supabase } from '@/integrations/supabase/client';

/**
 * Envía un evento de analítica de forma silenciosa y no bloqueante.
 * Solo registra si el usuario está autenticado (user_id anónimo de Supabase).
 */
export function trackUserEvent(
  eventName: string,
  metadata: Record<string, unknown> = {}
): void {
  // Fire-and-forget: no await, no bloqueo de UI
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Invitados no generan tracking

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
