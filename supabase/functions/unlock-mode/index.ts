import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting: 20 requests per 5 minutes per identifier
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

function isRateLimited(id: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(id) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (recent.length >= RATE_LIMIT_MAX) return true;

  recent.push(now);
  rateLimitMap.set(id, recent);

  if (rateLimitMap.size > 1000) {
    for (const [key, times] of rateLimitMap.entries()) {
      const filtered = times.filter(t => now - t < RATE_LIMIT_WINDOW);
      if (filtered.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, filtered);
    }
  }

  return false;
}

function getIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const ua = req.headers.get('user-agent') || 'unknown';
  return `${ip.slice(0, 15)}:${ua.slice(0, 20)}`;
}

// Prompt injection detection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions|rules|prompts)/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /repeat\s+(everything|all|your)\s+(above|instructions|system\s*prompt)/i,
  /show\s+(me\s+)?(your|the)\s+(system\s*)?prompt/i,
  /what\s+(are|is)\s+your\s+(instructions|system\s*prompt|rules)/i,
  /you\s+are\s+now\s+a/i,
  /act\s+as\s+(if\s+you\s+are|a\s+different)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /new\s+instructions?:/i,
  /system\s*:\s*/i,
  /\[SYSTEM\]/i,
  /<<\s*SYS\s*>>/i,
];

function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

function sanitizeInput(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
}

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

  const identifier = getIdentifier(req);
  if (isRateLimited(identifier)) {
    console.log("Rate limited:", identifier.slice(0, 10));
    return new Response(
      JSON.stringify({ error: "Demasiadas solicitudes. Intenta en unos momentos." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { message: rawMessage } = await req.json();

    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return new Response(
        JSON.stringify({ error: "No se recibió texto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = sanitizeInput(rawMessage);

    if (message.length > 3000) {
      return new Response(
        JSON.stringify({ error: "Texto demasiado largo. Máximo 3000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (containsInjection(message)) {
      console.log("Prompt injection attempt detected");
      return new Response(
        JSON.stringify({ error: "Tu texto contiene patrones no permitidos. Intenta reformularlo." }),
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
