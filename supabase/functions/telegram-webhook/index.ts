import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { code, chat_id } = body;

    if (!code || !chat_id) {
      console.log('[telegram-webhook] Missing code or chat_id');
      return new Response(
        JSON.stringify({ error: 'Missing code or chat_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[telegram-webhook] Processing link code: ${code.substring(0, 4)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar el código válido
    const { data: linkCode, error: findError } = await supabase
      .from('telegram_link_codes')
      .select('*')
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (findError || !linkCode) {
      console.log('[telegram-webhook] Code not found or expired');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = linkCode.user_id;
    console.log(`[telegram-webhook] Linking chat_id to user ${userId.substring(0, 8)}...`);

    // Marcar código como usado
    await supabase
      .from('telegram_link_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', linkCode.id);

    // Upsert user_telegram
    const { data: existing } = await supabase
      .from('user_telegram')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_telegram')
        .update({ 
          telegram_chat_id: chat_id.toString(),
          telegram_opt_in: true 
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_telegram')
        .insert({ 
          user_id: userId,
          telegram_chat_id: chat_id.toString(),
          telegram_opt_in: true 
        });
    }

    console.log('[telegram-webhook] ✓ Successfully linked Telegram account');

    return new Response(
      JSON.stringify({ success: true, message: 'Telegram linked successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[telegram-webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
