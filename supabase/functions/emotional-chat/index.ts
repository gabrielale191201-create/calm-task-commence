import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation limits
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES_COUNT = 50;

// Rate limiting: 20 requests per 5 minutes per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }
  
  recentTimestamps.push(now);
  rateLimitMap.set(userId, recentTimestamps);
  
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

// Generate anonymous identifier for rate limiting (IP + User-Agent hash)
function getAnonymousId(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const ua = req.headers.get('user-agent') || 'unknown';
  // Simple hash for rate limiting only
  const combined = `${ip}-${ua.slice(0, 50)}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return `anon_${Math.abs(hash).toString(36)}`;
}

async function validateAuth(req: Request): Promise<{ userId: string; isGuest: boolean }> {
  const authHeader = req.headers.get('Authorization');
  
  // If no valid auth header, treat as guest
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: getAnonymousId(req), isGuest: true };
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getClaims(token);
    
    if (error || !data?.claims) {
      // Invalid token, treat as guest
      return { userId: getAnonymousId(req), isGuest: true };
    }

    return { userId: data.claims.sub as string, isGuest: false };
  } catch {
    return { userId: getAnonymousId(req), isGuest: true };
  }
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate authentication (guests get an anonymous ID for rate limiting)
  const { userId, isGuest } = await validateAuth(req);
  console.log(`CHAT_EMOCIONAL: ${isGuest ? 'guest' : 'user'} ${userId.slice(0, 8)}...`);

  // Rate limiting per user
  if (isRateLimited(userId)) {
    console.log("Rate limited user:", userId);
    return new Response(
      JSON.stringify({ error: "rate_limited" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    console.log("CHAT_EMOCIONAL request from user:", userId);
    
    let messages: { role: string; content: string }[];
    
    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      messages = body.messages;
    } else if (body.message && typeof body.message === 'string' && body.message.trim()) {
      messages = [{ role: 'user', content: body.message.trim() }];
    } else {
      return new Response(
        JSON.stringify({ response: "No me llegó tu mensaje. ¿Puedes escribirlo otra vez?" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length > MAX_MESSAGES_COUNT) {
      return new Response(
        JSON.stringify({ error: `Demasiados mensajes. Máximo ${MAX_MESSAGES_COUNT} mensajes por conversación.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log("Request processed successfully for user:", userId);

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
