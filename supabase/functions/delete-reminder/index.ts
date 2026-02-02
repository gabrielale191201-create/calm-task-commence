import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://id-preview--ee67add7-fb83-488d-a1bb-f6aa1acc5d65.lovable.app',
  'https://calm-task-commence.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { deviceId, taskId } = await req.json();

    if (!deviceId || !taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing deviceId or taskId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete all unsent reminders for this device and task
    const { error, count } = await supabase
      .from('reminders')
      .delete()
      .eq('device_id', deviceId)
      .eq('task_id', taskId)
      .eq('sent', false);

    if (error) {
      console.error('Error deleting reminder:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to delete reminder' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleted ${count || 0} reminder(s) for task ${taskId}`);
    return new Response(
      JSON.stringify({ success: true, deleted: count || 0 }),
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
