import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push implementation
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; shouldDelete: boolean }> {
  try {
    const webpush = await import('https://esm.sh/web-push@3.6.7');
    
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    await webpush.sendNotification(pushSubscription, payload);
    console.log('[push] Sent to:', subscription.endpoint.substring(0, 50));
    return { success: true, shouldDelete: false };
  } catch (error) {
    const anyErr = error as any;
    const statusCode = anyErr?.statusCode;
    
    console.error('[push] Failed:', {
      name: anyErr?.name,
      message: anyErr?.message,
      statusCode,
      body: anyErr?.body,
      endpointPrefix: subscription.endpoint?.substring(0, 60),
    });

    // 404 or 410 means the subscription is no longer valid
    const shouldDelete = statusCode === 404 || statusCode === 410;
    return { success: false, shouldDelete };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate VAPID configuration
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:focuson@lovable.app';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[push] Missing VAPID keys');
    return new Response(
      JSON.stringify({ error: 'VAPID configuration missing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get pending reminders that should be sent now
    const now = new Date().toISOString();
    const { data: reminders, error: fetchError } = await supabase
      .from('reminders')
      .select('id, task_id, task_text, device_id, user_id')
      .eq('sent', false)
      .lte('run_at', now)
      .limit(50);

    if (fetchError) {
      console.error('[push] Error fetching reminders:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reminders || reminders.length === 0) {
      console.log('[push] No pending reminders');
      return new Response(
        JSON.stringify({ sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[push] Found ${reminders.length} reminders to send`);

    let sentCount = 0;
    const subscriptionsToDelete: string[] = [];

    for (const reminder of reminders) {
      // Fetch ALL subscriptions for this user (not just one device)
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('device_id, endpoint, p256dh, auth')
        .eq('user_id', reminder.user_id);
      
      if (!subscriptions || subscriptions.length === 0) {
        console.log('[push] No subscriptions for user:', reminder.user_id);
        // Mark reminder as sent to avoid retrying forever
        await supabase.from('reminders').update({ sent: true }).eq('id', reminder.id);
        continue;
      }

      const payload = JSON.stringify({
        title: 'Focus On',
        body: `Te acompaño con esto: ${reminder.task_text}`,
        taskId: reminder.task_id,
        url: '/tareas'
      });

      let anySent = false;

      for (const sub of subscriptions) {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );

        if (result.success) {
          anySent = true;
        }
        
        if (result.shouldDelete) {
          subscriptionsToDelete.push(sub.device_id);
        }
      }

      if (anySent) {
        sentCount++;
      }

      // Mark reminder as sent regardless of success to avoid infinite retries
      await supabase.from('reminders').update({ sent: true }).eq('id', reminder.id);
    }

    // Clean up invalid subscriptions
    if (subscriptionsToDelete.length > 0) {
      console.log(`[push] Deleting ${subscriptionsToDelete.length} invalid subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('device_id', subscriptionsToDelete);
    }

    console.log(`[push] Sent ${sentCount}/${reminders.length} notifications`);
    return new Response(
      JSON.stringify({ sent: sentCount, total: reminders.length, deleted: subscriptionsToDelete.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[push] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
