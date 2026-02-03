import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Validation constants
const MAX_DEVICE_ID_LENGTH = 100;
const MAX_TASK_ID_LENGTH = 100;
const MAX_TASK_TEXT_LENGTH = 1000;
const MAX_FUTURE_DAYS = 365; // Max 1 year in the future

// Truncate sensitive IDs for logging
function truncateId(id: string): string {
  if (!id || id.length <= 8) return id;
  return id.substring(0, 8) + '...';
}

// Validate runAt is a reasonable future date
function isValidRunAt(runAt: string): boolean {
  try {
    const date = new Date(runAt);
    if (isNaN(date.getTime())) return false;
    
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + MAX_FUTURE_DAYS);
    
    // Must be in the future but not more than 1 year
    return date > now && date <= maxFutureDate;
  } catch {
    return false;
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
    const { deviceId, taskId, taskText, runAt } = body;

    // Validate required fields presence
    if (!deviceId || !taskId || !taskText || !runAt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field types
    if (typeof deviceId !== 'string' || typeof taskId !== 'string' || 
        typeof taskText !== 'string' || typeof runAt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid field types' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field lengths
    if (deviceId.length > MAX_DEVICE_ID_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (taskId.length > MAX_TASK_ID_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (taskText.length > MAX_TASK_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Task text too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate runAt is a valid future date
    if (!isValidRunAt(runAt)) {
      return new Response(
        JSON.stringify({ error: 'Invalid reminder time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify that the subscription belongs to this user
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('device_id, user_id')
      .eq('device_id', deviceId)
      .eq('user_id', userId)
      .single();

    if (!sub) {
      // Generic error message - don't reveal if device exists
      return new Response(
        JSON.stringify({ error: 'Unable to process request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete any existing reminder for this task
    await supabase
      .from('reminders')
      .delete()
      .eq('device_id', deviceId)
      .eq('task_id', taskId)
      .eq('user_id', userId);

    // Insert new reminder with user_id
    const { error } = await supabase
      .from('reminders')
      .insert({
        device_id: deviceId,
        task_id: taskId,
        task_text: taskText.substring(0, MAX_TASK_TEXT_LENGTH), // Ensure length limit
        run_at: runAt,
        user_id: userId
      });

    if (error) {
      console.error('[save-reminder] DB error for user:', truncateId(userId));
      return new Response(
        JSON.stringify({ error: 'Failed to save reminder' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[save-reminder] Success for user:', truncateId(userId));
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[save-reminder] Error:', err instanceof Error ? err.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
