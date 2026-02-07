import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Acción: verificar si ya está conectado
    if (action === 'check') {
      const { data: telegram } = await supabase
        .from('user_telegram')
        .select('telegram_chat_id, telegram_opt_in')
        .eq('user_id', user.id)
        .maybeSingle();

      const isConnected = !!telegram?.telegram_chat_id;
      const optIn = telegram?.telegram_opt_in ?? false;

      return new Response(
        JSON.stringify({ connected: isConnected, optIn }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Acción: generar código de enlace
    if (action === 'generate') {
      // Limpiar códigos viejos del usuario
      await supabase
        .from('telegram_link_codes')
        .delete()
        .eq('user_id', user.id)
        .is('used_at', null);

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      const { error: insertError } = await supabase
        .from('telegram_link_codes')
        .insert({
          code,
          user_id: user.id,
          expires_at: expiresAt
        });

      if (insertError) {
        console.error('[telegram-link] Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const botUsername = Deno.env.get('TELEGRAM_BOT_USERNAME') || 'FocusOnBot';
      const deepLink = `https://t.me/${botUsername}?start=${code}`;

      console.log(`[telegram-link] Generated code for user ${user.id.substring(0, 8)}...`);

      return new Response(
        JSON.stringify({ deepLink, expiresIn: 600 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Acción: activar/desactivar opt-in
    if (action === 'opt-in') {
      const body = await req.json();
      const optIn = body.optIn === true;

      const { data: existing } = await supabase
        .from('user_telegram')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_telegram')
          .update({ telegram_opt_in: optIn })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_telegram')
          .insert({ user_id: user.id, telegram_opt_in: optIn });
      }

      return new Response(
        JSON.stringify({ success: true, optIn }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[telegram-link] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
