// Returns Google OAuth authorization URL for the authenticated user
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CLIENT_ID = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const STATE_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DEFAULT_REDIRECT_ORIGIN = 'https://focusonlife.app';
const ALLOWED_REDIRECT_ORIGINS = new Set([
  'https://focusonlife.app',
  'https://www.focusonlife.app',
  'https://calm-task-commence.lovable.app',
  'http://localhost:5173',
]);
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
  'profile',
].join(' ');

async function signState(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STATE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function normalizeRedirectOrigin(value?: string): string {
  try {
    const origin = new URL(value || DEFAULT_REDIRECT_ORIGIN).origin;
    if (ALLOWED_REDIRECT_ORIGINS.has(origin)) return origin;
    if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i.test(origin)) return origin;
  } catch (_) {
    // keep safe default
  }
  return DEFAULT_REDIRECT_ORIGIN;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = data.claims.sub;

    const body = await req.json().catch(() => ({}));
    const redirectOrigin = normalizeRedirectOrigin(body.redirect_origin || body.return_to);
    const redirectUri = `${redirectOrigin}/calendar/callback`;
    const returnTo: string = body.return_to || `${redirectOrigin}/`;

    const payloadObj = { u: userId, r: returnTo, d: redirectUri, n: crypto.randomUUID(), t: Date.now() };
    const payload = btoa(JSON.stringify(payloadObj))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const sig = await signState(payload);
    const state = `${payload}.${sig}`;

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });
    if (typeof data.claims.email === 'string') params.set('login_hint', data.claims.email);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
