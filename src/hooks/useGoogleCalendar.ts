import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Task } from '@/types/focuson';

const STATE_KEY = 'gcal-oauth-state';
const REDIRECT_PATH = '/calendar/callback';
const PRODUCTION_ORIGIN = 'https://focusonlife.app';
export const GOOGLE_CALENDAR_PENDING_CONNECT_KEY = 'focuson-pending-google-calendar-connect';
const GOOGLE_CALENDAR_ALLOWED_ORIGINS = new Set([
  PRODUCTION_ORIGIN,
  'https://www.focusonlife.app',
  'https://calm-task-commence.lovable.app',
]);

function shouldUseProductionOAuthOrigin() {
  return !GOOGLE_CALENDAR_ALLOWED_ORIGINS.has(window.location.origin);
}

function getGoogleCalendarRedirectUri() {
  const origin = shouldUseProductionOAuthOrigin()
    ? PRODUCTION_ORIGIN
    : window.location.origin;

  return `${origin}${REDIRECT_PATH}`;
}

export interface GoogleCalendarConnection {
  google_email: string | null;
  connected_at: string;
}

export function useGoogleCalendar() {
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setConnection(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('user_google_calendar')
      .select('google_email, created_at')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    setConnection(data ? { google_email: data.google_email, connected_at: data.created_at } : null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const connect = useCallback(async () => {
    setWorking(true);
    try {
      if (shouldUseProductionOAuthOrigin()) {
        toast.info('Google Calendar se conecta desde la app publicada', {
          description: 'Te llevo a focusonlife.app para usar una URL autorizada por Google.',
        });
        window.location.assign(`${PRODUCTION_ORIGIN}/?gcal_connect=1`);
        return;
      }

      localStorage.removeItem(GOOGLE_CALENDAR_PENDING_CONNECT_KEY);

      const redirect_uri = getGoogleCalendarRedirectUri();
      const { data, error } = await supabase.functions.invoke('google-calendar-connect', {
        body: { redirect_uri },
      });
      if (error) throw error;
      if (!data?.auth_url) throw new Error('No se recibió auth_url');
      sessionStorage.setItem(STATE_KEY, data.state);
      window.location.href = data.auth_url;
    } catch (e) {
      toast.error('No se pudo iniciar la conexión', { description: (e as Error).message });
      setWorking(false);
    }
  }, []);

  const completeOAuth = useCallback(async (code: string, state: string) => {
    const redirect_uri = getGoogleCalendarRedirectUri();
    const { data, error } = await supabase.functions.invoke('google-calendar-callback', {
      body: { code, state, redirect_uri },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    sessionStorage.removeItem(STATE_KEY);
    await refresh();
    return data;
  }, [refresh]);

  const disconnect = useCallback(async () => {
    setWorking(true);
    try {
      const { error } = await supabase.functions.invoke('google-calendar-disconnect', { body: {} });
      if (error) throw error;
      toast.success('Google Calendar desconectado');
      await refresh();
    } catch (e) {
      toast.error('No se pudo desconectar', { description: (e as Error).message });
    } finally {
      setWorking(false);
    }
  }, [refresh]);

  const syncTask = useCallback(async (task: Task) => {
    if (!task.scheduledDate || !task.scheduledTime || !task.durationMinutes) return null;

    const { data, error } = await supabase.functions.invoke('google-calendar-sync-task', {
      body: {
        action: 'upsert',
        task: {
          id: task.id,
          text: task.text,
          scheduledDate: task.scheduledDate,
          scheduledTime: task.scheduledTime,
          durationMinutes: task.durationMinutes,
          googleEventId: task.googleEventId ?? null,
        },
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as { event_id?: string; skipped?: string } | null;
  }, []);

  const deleteTaskEvent = useCallback(async (task: Task) => {
    if (!task.googleEventId) return null;

    const { data, error } = await supabase.functions.invoke('google-calendar-sync-task', {
      body: {
        action: 'delete',
        task: {
          id: task.id,
          text: task.text,
          googleEventId: task.googleEventId,
        },
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as { success?: boolean; skipped?: string } | null;
  }, []);

  return { connection, loading, working, connect, disconnect, completeOAuth, refresh, syncTask, deleteTaskEvent };
}
