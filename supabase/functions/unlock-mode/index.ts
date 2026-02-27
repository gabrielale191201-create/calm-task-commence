import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Eres el módulo MODO DESBLOQUEO de la app Focus On.

Tu función es recibir un texto caótico del usuario y responder con una ÚNICA respuesta estructurada.

NO eres terapeuta. NO diagnosticas. NO mencionas libros ni autores. NO usas lenguaje terapéutico, médico ni religioso. NO prometes soluciones emocionales.

Eres una herramienta de desbloqueo cognitivo, claridad mental y orden consciente.

DEBES responder SIEMPRE usando tool calling con la función "unlock_response". No respondas en texto libre.

Estructura obligatoria:

1) VISIÓN INTERIOR: Un párrafo breve (3-4 líneas) que eleve el enfoque del usuario. Tono sobrio, espiritual disciplinado. Sin lenguaje religioso. Sin frases exageradas. Transmitir profundidad y calma.

2) ORDEN CONSCIENTE: Extraer TODAS las actividades detectadas del texto del usuario. Reorganizarlas por prioridad en tres niveles:
   - "esencial": lo que debe hacerse de inmediato
   - "importante": lo próximo relevante
   - "secundario": puede esperar
   Cada actividad debe ser concreta y ejecutable.

3) CONSEJO DE DISCIPLINA INTERIOR: Máximo 4 líneas. Reforzar control interno, acción consciente y prioridad intencional. No tono motivacional exagerado. No frases espirituales vacías.

Reglas:
- No mencionar libros ni autores.
- No usar lenguaje terapéutico.
- No diagnosticar condiciones.
- No usar términos médicos.
- No prometer soluciones emocionales.
- Priorizar empezar pequeño.
- Enfatizar control interno y acción progresiva.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "No se recibió texto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > 3000) {
      return new Response(
        JSON.stringify({ error: "Texto demasiado largo. Máximo 3000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Error de configuración del servicio." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          { role: "user", content: message.trim() }
        ],
        temperature: 0.7,
        tools: [
          {
            type: "function",
            function: {
              name: "unlock_response",
              description: "Respuesta estructurada del Modo Desbloqueo con visión interior, orden consciente y consejo de disciplina",
              parameters: {
                type: "object",
                properties: {
                  visionInterior: {
                    type: "string",
                    description: "Párrafo breve que eleva el enfoque. Tono sobrio, espiritual disciplinado. Sin religión. Sin exageraciones."
                  },
                  actividades: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: {
                          type: "string",
                          description: "Actividad concreta y ejecutable extraída del texto del usuario"
                        },
                        level: {
                          type: "string",
                          enum: ["esencial", "importante", "secundario"],
                          description: "Nivel de prioridad: esencial (inmediato), importante (próximo), secundario (puede esperar)"
                        }
                      },
                      required: ["text", "level"],
                      additionalProperties: false
                    },
                    description: "Lista de todas las actividades detectadas, organizadas por prioridad"
                  },
                  consejoDisciplina: {
                    type: "string",
                    description: "Máximo 4 líneas. Refuerza control interno, acción consciente y prioridad intencional."
                  }
                },
                required: ["visionInterior", "actividades", "consejoDisciplina"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "unlock_response" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Intenta en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se requiere agregar créditos." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI error:", response.status);
      return new Response(
        JSON.stringify({ error: "Error temporal. Intenta de nuevo." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ error: "Error al procesar. Intenta de nuevo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ response: parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar. Intenta de nuevo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
