// Edge function: genera mensaje de bienvenida personalizado al final del onboarding.
// Usa Lovable AI Gateway (LOVABLE_API_KEY auto-provisto). Modelo: google/gemini-2.5-flash.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated user to prevent AI credit drain
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await sb.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const clip = (s: unknown, n: number) => (s ?? "").toString().trim().slice(0, n);
    const name = clip(body?.name, 100) || "campeón";
    const area = clip(body?.area, 200) || "no especificada";
    const obstacle = clip(body?.obstacle, 200) || "no especificado";
    const userType = clip(body?.userType, 50);
    const goal = clip(body?.goal, 200);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt =
      "Eres un coach de productividad empático. Responde SIEMPRE en español. Sé breve: máximo 2 oraciones.";

    const extra = [
      userType ? `tipo de usuario: ${userType}` : "",
      goal ? `meta principal: ${goal}` : "",
    ].filter(Boolean).join(", ");

    const userPrompt =
      `El usuario se llama ${name}, su área de mayor ruido mental es ${area} y su obstáculo principal es ${obstacle}` +
      (extra ? ` (${extra})` : "") +
      `. Escribe un mensaje de bienvenida motivador y personalizado.`;

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12000);

    let resp: Response;
    try {
      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      const errTxt = await resp.text();
      console.error("AI gateway error", resp.status, errTxt);
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes, intenta en un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `AI gateway error ${resp.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const message = (data?.choices?.[0]?.message?.content || "").trim();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Respuesta vacía de la IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-welcome error", e);
    return new Response(
      JSON.stringify({ error: (e as Error)?.message || "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
