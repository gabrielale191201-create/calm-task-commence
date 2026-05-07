// Edge function: genera el mensaje de bienvenida personalizado al final del onboarding.
// Usa ANTHROPIC_API_KEY (secret) — NUNCA exponer al cliente.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACKS: Record<string, (name: string) => string> = {
  profesional: (n) =>
    `Hola ${n}. Sé lo que es tener el día lleno y la mente saturada. Empieza hoy con una sola tarea: abre Focus On y escribe todo lo que tienes pendiente. La IA lo organizará por ti.`,
  emprendedor: (n) =>
    `Hola ${n}. Los emprendedores tienen mil ideas y poco tiempo. Hoy, escribe tus 3 tareas más importantes en Focus On y enfócate solo en esas. El resto puede esperar.`,
  estudiante: (n) =>
    `Hola ${n}. Estudiar con el cerebro saturado no funciona. Empieza por escribir todas tus pendientes en Focus On — la IA las ordena y tú ejecutas una a la vez.`,
  personal: (n) =>
    `Hola ${n}. El primer paso es simple: escribe todo lo que tienes en mente ahora mismo en Focus On. La claridad llega sola cuando sacas el caos de tu cabeza.`,
};

function fallback(userType: string | undefined, name: string) {
  const key = (userType || "personal").toLowerCase();
  const fn = FALLBACKS[key] || FALLBACKS.personal;
  return fn(name || "campeón");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const raw = await req.json();
    const clip = (s: unknown, n: number) => (s ?? "").toString().trim().slice(0, n);
    const name = clip(raw?.name, 100);
    const userType = clip(raw?.userType, 50);
    const area = clip(raw?.area, 200);
    const obstacle = clip(raw?.obstacle, 200);
    const goal = clip(raw?.goal, 200);
    const safeName = name || "campeón";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ message: fallback(userType, safeName), fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `Eres el asistente de Focus On, una app de productividad con IA.

Un nuevo usuario acaba de completar el onboarding con este perfil:
- Nombre: ${safeName}
- Tipo de usuario: ${userType || "no especificado"}
- Área de mayor ruido mental: ${area || "no especificado"}
- Principal obstáculo: ${obstacle || "no especificado"}
- Meta principal: ${goal || "no especificado"}

Escribe un mensaje de bienvenida personalizado y motivador de máximo 3 oraciones.
El mensaje debe:
1. Mencionar su nombre
2. Reconocer su situación específica (tipo de usuario + obstáculo)
3. Darle una micro-acción concreta para empezar HOY con Focus On

Tono: directo, empático, sin motivación barata. Como un coach real que te conoce.
Solo el mensaje, sin comillas ni explicaciones.`;

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12000);

    let message = "";
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 250,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const errTxt = await resp.text();
        console.error("Anthropic error", resp.status, errTxt);
        return new Response(
          JSON.stringify({ message: fallback(userType, safeName), fallback: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await resp.json();
      message = (data?.content?.[0]?.text || "").trim();
    } catch (e) {
      clearTimeout(timeout);
      console.error("Anthropic fetch failed", e);
    }

    if (!message) message = fallback(userType, safeName);

    return new Response(
      JSON.stringify({ message, fallback: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("onboarding-welcome error", e);
    return new Response(
      JSON.stringify({ message: fallback(undefined, "campeón"), fallback: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
