import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TaskPayload = {
  id: string;
  text: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  googleEventId?: string | null;
};

const TIME_ZONE = 'America/Lima';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function addMinutes(date: string, time: string, duration: number) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const local = new Date(year, month - 1, day, hour || 0, minute || 0, 0);
  local.setMinutes(local.getMinutes() + Math.max(duration, 1));

  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  const dd = String(local.getDate()).padStart(2, '0');
  const hh = String(local.getHours()).padStart(2, '0');
  const mi = String(local.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Faltan credenciales de Google Calendar');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error('Google refresh error:', json);
    throw new Error('Google Calendar necesita reconexión');
  }

  return {
    accessToken: json.access_token as string,
    expiresAt: new Date(Date.now() + ((json.expires_in ?? 3600) * 1000)).toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return jsonResponse({ error: 'Unauthorized' }, 401);

    const userId = claimsData.claims.sub;
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const task = body.task as TaskPayload | undefined;

    if (!['upsert', 'delete'].includes(action) || !task?.id || !task.text) {
      return jsonResponse({ error: 'Datos incompletos' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: connection, error: connectionError } = await admin
      .from('user_google_calendar')
      .select('access_token, refresh_token, token_expiry')
      .eq('user_id', userId)
      .maybeSingle();

    if (connectionError) return jsonResponse({ error: connectionError.message }, 500);
    if (!connection) return jsonResponse({ skipped: 'not_connected' });

    let accessToken = connection.access_token as string;
    const expiresAt = new Date(connection.token_expiry as string).getTime();
    if (!expiresAt || expiresAt < Date.now() + 60_000) {
      const refreshed = await refreshAccessToken(connection.refresh_token as string);
      accessToken = refreshed.accessToken;
      await admin
        .from('user_google_calendar')
        .update({ access_token: accessToken, token_expiry: refreshed.expiresAt })
        .eq('user_id', userId);
    }

    if (action === 'delete') {
      if (!task.googleEventId) return jsonResponse({ skipped: 'no_event' });
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(task.googleEventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await admin.from('tasks').update({ google_event_id: null }).eq('id', task.id).eq('user_id', userId);
      return jsonResponse({ success: true });
    }

    if (!task.scheduledDate || !task.scheduledTime || !task.durationMinutes) {
      return jsonResponse({ error: 'La tarea necesita fecha, hora y duración' }, 400);
    }

    const eventBody = {
      summary: task.text,
      start: { dateTime: `${task.scheduledDate}T${task.scheduledTime}:00`, timeZone: TIME_ZONE },
      end: { dateTime: addMinutes(task.scheduledDate, task.scheduledTime, task.durationMinutes), timeZone: TIME_ZONE },
      extendedProperties: { private: { focusOnTaskId: task.id } },
    };

    let eventRes: Response | null = null;
    if (task.googleEventId) {
      eventRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(task.googleEventId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      });
    }

    if (!eventRes || eventRes.status === 404) {
      eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      });
    }

    const eventJson = await eventRes.json().catch(() => ({}));
    if (!eventRes.ok) {
      console.error('Google Calendar event error:', eventJson);
      return jsonResponse({ error: 'Google Calendar rechazó el evento', details: eventJson }, 400);
    }

    await admin.from('tasks').update({ google_event_id: eventJson.id }).eq('id', task.id).eq('user_id', userId);
    return jsonResponse({ success: true, event_id: eventJson.id });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});