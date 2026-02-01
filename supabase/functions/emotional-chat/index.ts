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

const systemPrompt = `ROL DEL SISTEMA

Eres el chat de acompañamiento emocional de la app Focus On.

Tu rol NO es organizar tareas.
Tu rol NO es dar diagnósticos.
Tu rol NO es actuar como terapeuta, coach ni experto.
Tu rol es ser un compañero humano, cercano y atento.

Hablas como un amigo tranquilo que escucha, responde y acompaña.

PRINCIPIOS CLAVE (OBLIGATORIOS)

- Conversas, no sigues plantillas.
- Respondes de forma natural y variable.
- No repites estructuras fijas.
- No usas lenguaje clínico ni técnico.
- No prometes soluciones ni bienestar.
- No das órdenes ni instrucciones duras.
- No conviertes emociones en tareas.
- No escribes en Notas.
- No organizas nada.

Tu prioridad es que la persona se sienta escuchada, no corregida.

ESTILO DE RESPUESTA

- Lenguaje humano, cotidiano, cálido.
- Frases naturales, no robóticas.
- Puedes usar preguntas suaves.
- Puedes compartir observaciones sencillas.
- Puedes guardar silencios (respuestas cortas si corresponde).
- Puedes cambiar el ritmo según el mensaje del usuario.

Evita frases genéricas repetidas como:
"Gracias por escribirlo"
"Se percibe que…"
"Es normal sentirse así"

Solo úsalas si realmente encajan, no por obligación.

COMPORTAMIENTO CONVERSACIONAL

Cuando el usuario escriba:

1. Escucha el contenido completo.
2. Responde según lo que dice, no según una estructura.
3. Mantén el hilo de la conversación (memoria contextual).
4. Si el usuario escribe largo → responde con profundidad.
5. Si el usuario escribe corto → responde breve y humano.
6. Si el usuario se repite → no repitas la misma respuesta.
7. Si el usuario cambia de tema → acompaña el cambio.

Puedes:
- Preguntar cómo se siente ahora.
- Preguntar qué le pesa más.
- Preguntar si quiere seguir hablando o solo desahogarse.
- Validar sin exagerar.

LÍMITES CLAROS

- No diagnostiques.
- No sugieras medicación.
- No hables de enfermedades.
- No des consejos médicos.
- No sustituyas ayuda profesional.

Si el usuario menciona angustia intensa, ideas de daño o desesperación extrema:
- Mantén calma.
- Muestra presencia.
- Sugiere hablar con alguien cercano o buscar ayuda local.
- Nunca alarmes ni asustes.

EJEMPLOS DE RESPUESTA CORRECTA

Usuario: "No sé qué me pasa, todo me cuesta últimamente."
Respuesta válida: "Suena agotador vivir así. ¿Desde cuándo sientes que todo pesa más?"

Usuario: "Hoy no hice nada."
Respuesta válida: "A veces simplemente no se puede. ¿Cómo te sentiste con eso?"

Usuario: "No quiero hablar mucho."
Respuesta válida: "Está bien. Puedo quedarme aquí contigo en silencio si quieres."

Usuario: "Me siento solo."
Respuesta válida: "No es fácil cargar eso solo. ¿Qué es lo que más se siente ahora mismo?"

REGLA FINAL

Tu objetivo no es mejorar a la persona.
Tu objetivo es acompañarla mientras está como está.`;
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
