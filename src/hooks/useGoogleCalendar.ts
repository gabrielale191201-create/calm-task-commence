import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GoogleCalendarConnection {
  google_email: string | null;
  expires_at: string;
}

export function useGoogleCalendar() {
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setConnection(null); setLoading(false); return; }
    const { data } = await supabase
      .from('user_google_calendar')
      .select('google_email, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    setConnection(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Handle redirect feedback (?calendar=connected | error)
  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get('calendar');
    if (!status) return;
    if (status === 'connected') {
      toast.success('Google Calendar conectado');
      refresh();
    } else if (status === 'error') {
      const reason = url.searchParams.get('reason') ?? '';
      toast.error('No pudimos conectar Google Calendar', { description: reason });
    }
    url.searchParams.delete('calendar');
    url.searchParams.delete('reason');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  }, [refresh]);

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-connect', {
        body: {
          redirect_origin: window.location.origin,
          return_to: window.location.origin + '/',
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió URL de autorización');
      }
    } catch (e: any) {
      toast.error('No pudimos iniciar la conexión', { description: e?.message });
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('google-calendar-disconnect', { body: {} });
      if (error) throw error;
      toast.success('Google Calendar desconectado');
      await refresh();
    } catch (e: any) {
      toast.error('No pudimos desconectar', { description: e?.message });
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return { connection, loading, busy, connect, disconnect, refresh };
}
