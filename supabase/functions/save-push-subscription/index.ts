import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Validation constants
const MAX_DEVICE_ID_LENGTH = 100;
const MAX_ENDPOINT_LENGTH = 500;
const MAX_P256DH_LENGTH = 200;
const MAX_AUTH_LENGTH = 200;

// Known push service URL patterns
const VALID_PUSH_SERVICE_PATTERNS = [
  /^https:\/\/fcm\.googleapis\.com\//,
  /^https:\/\/.*\.push\.apple\.com\//,
  /^https:\/\/updates\.push\.services\.mozilla\.com\//,
  /^https:\/\/.*\.notify\.windows\.com\//,
  /^https:\/\/.*\.push\.services\.mozilla\.org\//,
];

// Truncate sensitive IDs for logging
function truncateId(id: string): string {
  if (!id || id.length <= 8) return id;
  return id.substring(0, 8) + '...';
}

// Validate push endpoint URL
function isValidPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') return false;
    return VALID_PUSH_SERVICE_PATTERNS.some(pattern => pattern.test(endpoint));
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
    const { deviceId, endpoint, p256dh, auth } = body;

    // Validate required fields presence
    if (!deviceId || !endpoint || !p256dh || !auth) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field types
    if (typeof deviceId !== 'string' || typeof endpoint !== 'string' || 
        typeof p256dh !== 'string' || typeof auth !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid field types' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field lengths
    if (deviceId.length > MAX_DEVICE_ID_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Device ID too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (endpoint.length > MAX_ENDPOINT_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Endpoint too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (p256dh.length > MAX_P256DH_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (auth.length > MAX_AUTH_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate endpoint URL format
    if (!isValidPushEndpoint(endpoint)) {
      return new Response(
        JSON.stringify({ error: 'Invalid push service endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Upsert subscription with user_id
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { device_id: deviceId, endpoint, p256dh, auth, user_id: userId },
        { onConflict: 'device_id' }
      );

    if (error) {
      console.error('[save-push-subscription] DB error for user:', truncateId(userId));
      return new Response(
        JSON.stringify({ error: 'Failed to save subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[save-push-subscription] Success for user:', truncateId(userId));
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[save-push-subscription] Error:', err instanceof Error ? err.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
