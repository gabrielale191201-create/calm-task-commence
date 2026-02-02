import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { deviceId, taskId, taskText, runAt } = await req.json();

    if (!deviceId || !taskId || !taskText || !runAt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if subscription exists
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('device_id')
      .eq('device_id', deviceId)
      .single();

    if (!sub) {
      return new Response(
        JSON.stringify({ error: 'Device not subscribed to push notifications' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete any existing reminder for this task
    await supabase
      .from('reminders')
      .delete()
      .eq('device_id', deviceId)
      .eq('task_id', taskId);

    // Insert new reminder
    const { error } = await supabase
      .from('reminders')
      .insert({
        device_id: deviceId,
        task_id: taskId,
        task_text: taskText,
        run_at: runAt
      });

    if (error) {
      console.error('Error saving reminder:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save reminder' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Reminder saved:', { taskId, runAt });
    return new Response(
      JSON.stringify({ success: true }),
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
