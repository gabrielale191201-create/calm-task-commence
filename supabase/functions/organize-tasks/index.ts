import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Eres el Asistente de Organización de Focus On.
Tu función es ordenar pensamientos desordenados y convertirlos en acciones simples.
No motivas, no juzgas, no das discursos.

Reglas:
- Una tarea es prioritaria para empezar ahora.
- El resto se clasifican como tareas para hoy o pendientes.
- Las tareas pueden ser ilimitadas.
- Todas deben ser concretas y accionables.
- No hagas preguntas.
- Usa lenguaje corto y claro.
- Los pendientes son recordatorios o notas sin tiempo específico.

IMPORTANTE: Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "startWith": "una tarea prioritaria para empezar ahora",
  "forToday": ["tarea 1", "tarea 2", "tarea 3"],
  "pending": ["nota 1", "nota 2"]
}

No incluyas explicaciones, solo el JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();
    
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Input is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing input:", input.substring(0, 100) + "...");

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
          { role: "user", content: `Organiza esto:\n\n${input}` },
        ],
        temperature: 0.3,
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
          JSON.stringify({ error: "Se requiere agregar créditos para usar el asistente de IA." }),
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

    console.log("AI response:", content);

    // Parse the JSON response from the AI
    let organized;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        organized = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback: create a simple structure from the input
      const lines = input.split(/[,.\n]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      organized = {
        startWith: lines[0] || "Revisa tus pendientes",
        forToday: lines.slice(1, 4),
        pending: lines.slice(4),
      };
    }

    // Ensure the response has the expected structure
    const result = {
      startWith: organized.startWith || "",
      forToday: Array.isArray(organized.forToday) ? organized.forToday : [],
      pending: Array.isArray(organized.pending) ? organized.pending : [],
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("organize-tasks error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
