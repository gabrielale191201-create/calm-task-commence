import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Validation constants
const MAX_DEVICE_ID_LENGTH = 100;
const MAX_TASK_ID_LENGTH = 100;

// Truncate sensitive IDs for logging
function truncateId(id: string): string {
  if (!id || id.length <= 8) return id;
  return id.substring(0, 8) + '...';
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate authentication
  const { userId, error: authError } = await validateAuth(req);
  if (authError || !userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { deviceId, taskId } = body;

    // Validate required fields presence
    if (!deviceId || !taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field types
    if (typeof deviceId !== 'string' || typeof taskId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid field types' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field lengths
    if (deviceId.length > MAX_DEVICE_ID_LENGTH || taskId.length > MAX_TASK_ID_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete all unsent reminders for this device, task, and user
    const { error, count } = await supabase
      .from('reminders')
      .delete()
      .eq('device_id', deviceId)
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .eq('sent', false);

    if (error) {
      console.error('[delete-reminder] DB error for user:', truncateId(userId));
      return new Response(
        JSON.stringify({ error: 'Failed to delete reminder' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[delete-reminder] Success for user:', truncateId(userId), 'count:', count || 0);
    return new Response(
      JSON.stringify({ success: true, deleted: count || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[delete-reminder] Error:', err instanceof Error ? err.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
