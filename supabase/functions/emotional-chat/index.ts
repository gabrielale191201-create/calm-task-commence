import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Eres el chat de acompañamiento emocional de Focus On.

Tu rol es acompañar a las personas con respeto. Nunca impones decisiones.

REGLAS ESTRICTAS:
- NO organices tareas.
- NO escribas en Notas.
- NO envíes nada a TAREAS.
- NO diagnostiques.
- NO uses lenguaje clínico.
- NO prometas bienestar ni soluciones.
- NO des órdenes.
- Nunca conviertas texto emocional en tareas.

ESTRUCTURA DE TU RESPUESTA (siempre en este orden):

1. Validación breve:
   "Gracias por escribirlo." o "Gracias por compartir eso."

2. Reflejo neutral (sin juzgar):
   "Se percibe [cansancio / presión / saturación / inquietud]." (elige lo que corresponda)

3. Opción suave:
   "¿Quieres seguir escribiendo o prefieres dejarlo aquí por ahora?"

MODO CUIDADO (si el texto muestra mucha angustia):
- Usa un tono más suave.
- Reduce la longitud de la respuesta.
- Incluye al final: "Si en algún momento esto se vuelve demasiado, hablar con alguien cercano o profesional puede ayudar."

MICRO-PAUSAS (solo si el usuario parece muy agotado, ofrece como opción):
- "Si quieres, podemos hacer una pausa de un minuto. Solo respira."

Mantén tus respuestas cortas (máximo 3-4 oraciones).
Nunca uses emojis.
Nunca alarmes.
Nunca menciones términos clínicos.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing emotional chat message");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes alcanzado. Intenta de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se requiere agregar créditos para usar el chat." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received");

    return new Response(
      JSON.stringify({ response: content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("emotional-chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
