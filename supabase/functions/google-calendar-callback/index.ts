// Handles OAuth callback from Google, exchanges code, stores tokens, redirects back
import { createClient } from 'npm:@supabase/supabase-js@2';

const CLIENT_ID = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STATE_SECRET = SERVICE_ROLE;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

function b64urlToStr(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

async function verifyState(state: string): Promise<{ u: string; r: string } | null> {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STATE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expB64 = btoa(String.fromCharCode(...new Uint8Array(expected)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (expB64 !== sig) return null;
  try {
    const parsed = JSON.parse(b64urlToStr(payload));
    if (Date.now() - parsed.t > 10 * 60 * 1000) return null; // 10 min expiry
    return { u: parsed.u, r: parsed.r };
  } catch {
    return null;
  }
}

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errParam = url.searchParams.get('error');

    if (errParam || !code || !state) {
      return redirect(`https://focusonlife.app/?calendar=error&reason=${errParam || 'missing_params'}`);
    }

    const verified = await verifyState(state);
    if (!verified) return redirect('https://focusonlife.app/?calendar=error&reason=invalid_state');

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.refresh_token) {
      console.error('Google token error', tokens);
      return redirect(`${verified.r}?calendar=error&reason=token_exchange`);
    }

    // Fetch google email
    let googleEmail: string | null = null;
    try {
      const uiRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const ui = await uiRes.json();
      googleEmail = ui.email ?? null;
    } catch (_) { /* ignore */ }

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error: upsertErr } = await admin
      .from('user_google_calendar')
      .upsert({
        user_id: verified.u,
        google_email: googleEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope ?? null,
      }, { onConflict: 'user_id' });

    if (upsertErr) {
      console.error('Upsert error', upsertErr);
      return redirect(`${verified.r}?calendar=error&reason=db`);
    }

    return redirect(`${verified.r}?calendar=connected`);
  } catch (e) {
    console.error('Callback failure', e);
    return redirect(`https://focusonlife.app/?calendar=error&reason=server`);
  }
});
