import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push implementation
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<boolean> {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

  try {
    const webpush = await import('https://esm.sh/web-push@3.6.7');
    
    webpush.setVapidDetails(
      'mailto:focuson@lovable.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    await webpush.sendNotification(pushSubscription, payload);
    console.log('Push sent successfully to:', subscription.endpoint.substring(0, 50));
    return true;
  } catch (error) {
    // web-push throws rich errors with statusCode / body in many cases.
    const anyErr = error as any;
    console.error('Failed to send push:', {
      name: anyErr?.name,
      message: anyErr?.message,
      statusCode: anyErr?.statusCode,
      body: anyErr?.body,
      endpointPrefix: subscription.endpoint?.substring(0, 60),
    });
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // This function is called by a cron job, not by users directly
  // It uses service_role to access data and send notifications

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
      console.error('Error fetching reminders:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reminders || reminders.length === 0) {
      console.log('No pending reminders to send');
      return new Response(
        JSON.stringify({ sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${reminders.length} reminders to send`);

    let sentCount = 0;
    const failedIds: string[] = [];

    for (const reminder of reminders) {
      // Fetch subscription - verify user ownership
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('device_id', reminder.device_id)
        .eq('user_id', reminder.user_id)
        .single();
      
      if (!subscription) {
        console.log('No subscription for reminder:', reminder.id);
        failedIds.push(reminder.id);
        continue;
      }

      const payload = JSON.stringify({
        title: reminder.task_text,
        body: 'Es momento de empezar',
        taskId: reminder.task_id
      });

      const success = await sendWebPush(subscription, payload);

      if (success) {
        sentCount++;
        await supabase
          .from('reminders')
          .update({ sent: true })
          .eq('id', reminder.id);
      } else {
        failedIds.push(reminder.id);
      }
    }

    // Clean up failed reminders
    if (failedIds.length > 0) {
      await supabase
        .from('reminders')
        .update({ sent: true })
        .in('id', failedIds);
    }

    console.log(`Sent ${sentCount}/${reminders.length} notifications`);
    return new Response(
      JSON.stringify({ sent: sentCount, total: reminders.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
