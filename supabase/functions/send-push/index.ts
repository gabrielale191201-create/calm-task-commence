import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<{ success: boolean; shouldDelete: boolean }> {
  try {
    const webpush = await import('https://esm.sh/web-push@3.6.7');
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      payload,
    );
    return { success: true, shouldDelete: false };
  } catch (err) {
    const e = err as any;
    const status = e?.statusCode;
    console.error('[send-push] failed:', { status, message: e?.message });
    return { success: false, shouldDelete: status === 404 || status === 410 };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth: allow either valid CRON_SECRET header OR service-role key
  const cronSecret = Deno.env.get('CRON_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const providedCron = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization') || '';
  const providedBearer = authHeader.replace('Bearer ', '');
  const cronOk = !!cronSecret && providedCron === cronSecret;
  const serviceOk = !!serviceRoleKey && providedBearer === serviceRoleKey;
  if (!cronOk && !serviceOk) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:focuson@lovable.app';

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: 'VAPID keys missing' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const nowIso = new Date().toISOString();

    // Find pending tasks scheduled at/before now that haven't been notified
    const { data: tasks, error: tErr } = await supabase
      .from('tasks')
      .select('id, user_id, text, scheduled_date, scheduled_time, status, reminder_sent_at')
      .eq('status', 'pending')
      .is('reminder_sent_at', null)
      .not('scheduled_date', 'is', null)
      .not('scheduled_time', 'is', null)
      .limit(200);

    if (tErr) {
      console.error('[send-push] tasks query error:', tErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const due = (tasks ?? []).filter((t) => {
      const dt = new Date(`${t.scheduled_date}T${t.scheduled_time}`).toISOString();
      return dt <= nowIso;
    });

    if (due.length === 0) {
      return new Response(JSON.stringify({ sent: 0, due: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    const toDelete: string[] = [];

    for (const task of due) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', task.user_id);

      if (!subs || subs.length === 0) {
        await supabase.from('tasks').update({ reminder_sent_at: nowIso }).eq('id', task.id);
        continue;
      }

      const payload = JSON.stringify({
        title: '⏰ Focus On — Es tu momento',
        body: task.text,
        taskId: task.id,
        url: '/tareas',
      });

      let any = false;
      for (const s of subs) {
        const r = await sendWebPush(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          payload, vapidPublicKey, vapidPrivateKey, vapidSubject,
        );
        if (r.success) any = true;
        if (r.shouldDelete) toDelete.push(s.endpoint);
      }
      if (any) sentCount++;
      await supabase.from('tasks').update({ reminder_sent_at: nowIso }).eq('id', task.id);
    }

    if (toDelete.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', toDelete);
    }

    return new Response(JSON.stringify({ sent: sentCount, due: due.length, cleaned: toDelete.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-push] error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
