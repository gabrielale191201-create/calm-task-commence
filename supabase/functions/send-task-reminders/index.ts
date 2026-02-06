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

    // Get tasks that need reminders sent
    // Tasks where: reminder_enabled=true, scheduled_date/time <= now, reminder_sent_at IS NULL, status=pending
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM

    console.log('[push] Checking for due reminders at:', currentDate, currentTime);

    // Query tasks that are due for reminder
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, text, user_id, scheduled_date, scheduled_time')
      .eq('reminder_enabled', true)
      .eq('status', 'pending')
      .is('reminder_sent_at', null)
      .or(`scheduled_date.lt.${currentDate},and(scheduled_date.eq.${currentDate},scheduled_time.lte.${currentTime})`)
      .limit(50);

    if (fetchError) {
      console.error('[push] Error fetching tasks:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tasks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tasks || tasks.length === 0) {
      console.log('[push] No tasks due for reminders');
      return new Response(
        JSON.stringify({ sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[push] Found ${tasks.length} tasks due for reminders`);

    let sentCount = 0;
    const subscriptionsToDelete: string[] = [];

    for (const task of tasks) {
      // Fetch ALL subscriptions for this user
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('device_id, endpoint, p256dh, auth')
        .eq('user_id', task.user_id);
      
      if (!subscriptions || subscriptions.length === 0) {
        console.log('[push] No subscriptions for user:', task.user_id.substring(0, 8));
        // Mark as sent to avoid retrying
        await supabase
          .from('tasks')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', task.id);
        continue;
      }

      const payload = JSON.stringify({
        title: 'Focus On',
        body: `Te acompaño con esto: ${task.text}`,
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

      // Mark reminder as sent
      await supabase
        .from('tasks')
        .update({ reminder_sent_at: now.toISOString() })
        .eq('id', task.id);
    }

    // Clean up invalid subscriptions
    if (subscriptionsToDelete.length > 0) {
      console.log(`[push] Deleting ${subscriptionsToDelete.length} invalid subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('device_id', subscriptionsToDelete);
    }

    console.log(`[push] Sent ${sentCount}/${tasks.length} notifications`);
    return new Response(
      JSON.stringify({ sent: sentCount, total: tasks.length, deleted: subscriptionsToDelete.length }),
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
