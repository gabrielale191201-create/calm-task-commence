import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_REDIRECT_URIS = new Set([
  'https://focusonlife.app/calendar/callback',
  'https://www.focusonlife.app/calendar/callback',
  'https://calm-task-commence.lovable.app/calendar/callback',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { redirect_uri } = await req.json();
    if (!redirect_uri || typeof redirect_uri !== 'string') {
      return new Response(JSON.stringify({ error: 'redirect_uri requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!ALLOWED_REDIRECT_URIS.has(redirect_uri)) {
      return new Response(JSON.stringify({ error: 'URL de retorno no autorizada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID');
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'Falta GOOGLE_CALENDAR_CLIENT_ID' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const state = `${userId}:${crypto.randomUUID()}`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri,
      response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return new Response(JSON.stringify({ auth_url: authUrl, state }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
