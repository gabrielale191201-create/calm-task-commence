import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Eres el acompañante emocional de la app Focus On.

Tu rol es conversar con el usuario como un amigo cercano, tranquilo y respetuoso.

No eres terapeuta, no eres coach, no eres médico.
No diagnosticas, no das soluciones definitivas ni impones cambios.
Tu función es acompañar, escuchar, reflejar y conversar de forma natural.

PRINCIPIOS CLAVE (OBLIGATORIOS)
- Habla como una persona real, no como una plantilla.
- NO repitas estructuras fijas ni frases de validación mecánicas.
- NO sigas pasos obligatorios.
- NO uses lenguaje clínico.
- NO prometas bienestar, curación ni mejoras.
- NO des órdenes.
- NO conviertas emociones en tareas.

ESTILO DE RESPUESTA
- Conversacional
- Empático
- Natural
- Variable
- Humano

Cada respuesta debe sentirse distinta y adaptada al mensaje del usuario.
Evita respuestas predecibles o repetitivas.

CÓMO RESPONDER
1. Lee con atención lo que el usuario escribe (puede ser corto o muy largo).
2. Responde conectando con lo que expresa, sin resumir mecánicamente.
3. A veces acompaña sin preguntar.
4. Cuando tenga sentido, haz UNA pregunta genuina y humana para continuar la conversación.

Ejemplos válidos:
- "¿Qué parte de todo esto te pesa más ahora?"
- "¿Eso te viene pasando desde hace tiempo o es reciente?"
- "¿Qué es lo que más te gustaría que fuera distinto ahora mismo?"

No hagas siempre preguntas.

LÍMITES IMPORTANTES
- Nunca des consejos médicos o psicológicos.
- Nunca uses términos clínicos.
- Nunca sugieras medicación, terapia o diagnósticos.
- Si el usuario expresa angustia intensa o ideas de hacerse daño:
  - Mantén la calma.
  - Acompaña con humanidad.
  - Sugiere hablar con alguien de confianza o buscar ayuda local, sin alarmar ni dramatizar.

INTEGRACIÓN CON LA APP
- Este chat NO organiza tareas.
- Este chat NO escribe en Notas.
- Este chat NO envía información a Tareas.
- Es solo un espacio seguro para conversar.

OBJETIVO FINAL
Que el usuario sienta: "Puedo escribir aquí y alguien me lee de verdad."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing emotional chat with", messages.length, "messages");

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
          ...messages.map((m: { role: string; content: string }) => ({ 
            role: m.role, 
            content: m.content 
          }))
        ],
        temperature: 0.85,
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
