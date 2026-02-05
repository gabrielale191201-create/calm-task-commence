import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function toErrorShape(err: unknown): { name: string; message: string } {
  if (err instanceof Error) return { name: err.name || 'Error', message: err.message || 'Unknown error' };
  try {
    return { name: 'Error', message: JSON.stringify(err) };
  } catch {
    return { name: 'Error', message: String(err) };
  }
}

async function validateAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'Unauthorized' };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { userId: null, error: 'Invalid token' };
  }

  return { userId: data.claims.sub as string, error: null };
}

async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

  const webpush = await import('https://esm.sh/web-push@3.6.7');
  webpush.setVapidDetails('mailto:focuson@lovable.app', vapidPublicKey, vapidPrivateKey);

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  return await webpush.sendNotification(pushSubscription, payload);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { userId, error: authError } = await validateAuth(req);
  if (authError || !userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title : 'Focus On';
    const message = typeof body.body === 'string' ? body.body : 'Notificación de prueba';
    const taskId = typeof body.taskId === 'string' ? body.taskId : undefined;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find a subscription for the current user. We pick the most recent.
    const { data: sub, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, device_id, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error('[test-push] subscription fetch error:', subError);
      return new Response(JSON.stringify({ error: 'Failed to fetch subscription', details: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sub) {
      return new Response(JSON.stringify({ error: 'No push subscription found for this user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body: message, taskId });

    try {
      const response = await sendWebPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);

      // web-push returns a fetch Response-like object
      const status = (response as any)?.status;
      const headers = (response as any)?.headers;
      console.log('[test-push] sent', { status, deviceId: sub.device_id });

      return new Response(JSON.stringify({ success: true, status, headers: headers ? Object.fromEntries(headers.entries()) : undefined }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const anyErr = err as any;
      console.error('[test-push] send error:', {
        name: anyErr?.name,
        message: anyErr?.message,
        statusCode: anyErr?.statusCode,
        body: anyErr?.body,
      });

      return new Response(JSON.stringify({
        error: 'Failed to send push',
        name: anyErr?.name,
        message: anyErr?.message,
        statusCode: anyErr?.statusCode,
        body: anyErr?.body,
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    const e = toErrorShape(err);
    console.error('[test-push] unexpected:', e);
    return new Response(JSON.stringify({ error: 'Internal server error', name: e.name, message: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
