import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS
const allowedOrigins = [
  "https://id-preview--ee67add7-fb83-488d-a1bb-f6aa1acc5d65.lovable.app",
  "https://calm-task-commence.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080"
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-beta-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Input validation limits
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES_COUNT = 50;

// Rate limiting: 20 requests per 5 minutes per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 20;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  
  // Filter out old timestamps
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }
  
  recentTimestamps.push(now);
  rateLimitMap.set(ip, recentTimestamps);
  
  // Cleanup old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, times] of rateLimitMap.entries()) {
      const filtered = times.filter(t => now - t < RATE_LIMIT_WINDOW);
      if (filtered.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, filtered);
      }
    }
  }
  
  return false;
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

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
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Token validation
  const BETA_ACCESS_TOKEN = Deno.env.get("BETA_ACCESS_TOKEN");
  const betaToken = req.headers.get("x-beta-token");
  
  if (!BETA_ACCESS_TOKEN || betaToken !== BETA_ACCESS_TOKEN) {
    console.log("Unauthorized access attempt");
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  if (isRateLimited(clientIP)) {
    console.log("Rate limited request");
    return new Response(
      JSON.stringify({ error: "rate_limited" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages } = await req.json();
    
    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere al menos un mensaje." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Message count validation
    if (messages.length > MAX_MESSAGES_COUNT) {
      return new Response(
        JSON.stringify({ error: `Demasiados mensajes. Máximo ${MAX_MESSAGES_COUNT} mensajes por conversación.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate individual message lengths
    for (const msg of messages) {
      if (!msg.content || typeof msg.content !== 'string') {
        return new Response(
          JSON.stringify({ error: "Formato de mensaje inválido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Mensaje demasiado largo. Máximo ${MAX_MESSAGE_LENGTH} caracteres.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Missing API key configuration");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servicio." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing request", { timestamp: new Date().toISOString(), messageCount: messages.length });

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
      // Log error internally but return generic message
      console.error("AI service error:", response.status);
      return new Response(
        JSON.stringify({ error: "Error temporal del servicio. Intenta de nuevo." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Empty AI response");
      return new Response(
        JSON.stringify({ error: "Error al procesar la respuesta. Intenta de nuevo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Request processed successfully");

    return new Response(
      JSON.stringify({ response: content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Request processing error");
    return new Response(
      JSON.stringify({ error: "Error al procesar tu solicitud. Intenta de nuevo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
