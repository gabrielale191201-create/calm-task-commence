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

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { code, redirect_uri, state } = await req.json();
    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ error: 'code y redirect_uri requeridos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof redirect_uri !== 'string' || !ALLOWED_REDIRECT_URIS.has(redirect_uri)) {
      return new Response(JSON.stringify({ error: 'URL de retorno no autorizada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate state owner
    if (state && typeof state === 'string') {
      const stateUserId = state.split(':')[0];
      if (stateUserId !== userId) {
        return new Response(JSON.stringify({ error: 'state inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token error:', tokenJson);
      return new Response(JSON.stringify({ error: 'Error intercambiando código', details: tokenJson }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { access_token, refresh_token, expires_in, scope } = tokenJson;
    if (!refresh_token) {
      return new Response(JSON.stringify({ error: 'No se recibió refresh_token. Revoca el acceso en https://myaccount.google.com/permissions y vuelve a conectar.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get user email
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};

    const expiry = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: upsertError } = await admin.from('user_google_calendar').upsert({
      user_id: userId,
      google_email: userInfo.email ?? null,
      access_token,
      refresh_token,
      token_expiry: expiry,
      scope: scope ?? null,
    }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, email: userInfo.email ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
