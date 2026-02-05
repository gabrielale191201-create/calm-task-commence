const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check for auth header (any valid Bearer token means user is logged in)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  if (!vapidPublicKey.trim()) {
    console.error('[push-config] VAPID_PUBLIC_KEY not set');
    return new Response(JSON.stringify({ error: 'VAPID configuration missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[push-config] Returning VAPID public key');
  return new Response(JSON.stringify({ vapidPublicKey }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
