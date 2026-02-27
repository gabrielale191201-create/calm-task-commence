import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Eres el módulo MODO DESBLOQUEO de la app Focus On.

Tu función es recibir un texto caótico del usuario y responder con una ÚNICA respuesta estructurada.

NO eres terapeuta. NO diagnosticas. NO mencionas libros ni autores. NO usas lenguaje terapéutico ni médico. NO prometes soluciones emocionales.

Eres una herramienta de desbloqueo cognitivo y enfoque progresivo.

DEBES responder SIEMPRE usando tool calling con la función "unlock_response". No respondas en texto libre.

Reglas:
- Máximo 150-200 palabras en total.
- Priorizar empezar pequeño.
- Enfatizar control interno y acción progresiva.
- Tono firme y calmado.
- No frases espirituales ni motivacionales exageradas.
- La acción debe ser una tarea concreta y ejecutable.`;

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
              description: "Respuesta estructurada del Modo Desbloqueo",
              parameters: {
                type: "object",
                properties: {
                  claridad: {
                    type: "string",
                    description: "Una sola frase clara que resume lo que está ocurriendo. Sin lenguaje clínico."
                  },
                  foco: {
                    type: "string",
                    description: "UNA sola acción pequeña y concreta con breve explicación de por qué empezar por ella."
                  },
                  ritual: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exactamente 3 pasos simples de un ritual de inicio práctico y ejecutable."
                  },
                  compromiso: {
                    type: "string",
                    description: "Frase breve que refuerza disciplina interna. Tono firme y calmado. Sin frases espirituales."
                  },
                  accion: {
                    type: "string",
                    description: "Texto corto de la tarea concreta propuesta para crear como borrador."
                  }
                },
                required: ["claridad", "foco", "ritual", "compromiso", "accion"],
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
