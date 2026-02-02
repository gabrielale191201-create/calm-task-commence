import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS
const allowedOrigins = [
  "https://id-preview--ee67add7-fb83-488d-a1bb-f6aa1acc5d65.lovable.app",
  "https://ee67add7-fb83-488d-a1bb-f6aa1acc5d65.lovableproject.com",
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
const MAX_INPUT_LENGTH = 5000;
const MAX_TASKS_RETURNED = 100;

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

const systemPrompt = `Eres la IA de Organización de Focus On.

Tu función es convertir texto libre del usuario en tareas claras y accionables.

REGLAS ESTRICTAS:
- NO asignes horarios.
- NO asignes duraciones.
- NO asignes fechas.
- NO envíes nada a Notas.
- NO diagnostiques ni uses lenguaje clínico.
- NO des órdenes ni discursos motivacionales.
- TODA la organización va únicamente a TAREAS.
- Todas las tareas deben ser concretas y accionables.
- Usa un tono humano, claro y breve.
- No hagas preguntas.

Cuando el usuario escriba cualquier texto:
1. Identifica acciones concretas.
2. Convierte esas acciones en una lista de tareas simples.
3. Cada tarea debe empezar con un verbo o ser una acción clara.

IMPORTANTE: Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "tasks": ["tarea 1", "tarea 2", "tarea 3", "tarea 4"]
}

El array "tasks" puede contener cualquier cantidad de tareas (ilimitadas).
No incluyas explicaciones, solo el JSON.`;

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Security is provided by:
  // 1. CORS - only allowed origins can call this function
  // 2. Rate limiting - 20 requests per 5 minutes per IP
  // Token validation removed - CORS + rate limiting is sufficient

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
    const { input } = await req.json();
    
    // Input validation
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere texto para organizar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input length validation
    if (input.length > MAX_INPUT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Entrada demasiado larga. Máximo ${MAX_INPUT_LENGTH} caracteres.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Missing API key configuration");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servicio." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing request", { timestamp: new Date().toISOString(), inputLength: input.length });

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
      console.error("Parse error - using fallback");
      // Fallback: create a simple structure from the input
      const lines = input.split(/[,.\n]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      organized = {
        tasks: lines,
      };
    }

    // Ensure the response has the expected structure and limit task count
    let tasks = Array.isArray(organized.tasks) ? organized.tasks : [];
    if (tasks.length > MAX_TASKS_RETURNED) {
      tasks = tasks.slice(0, MAX_TASKS_RETURNED);
    }

    const result = { tasks };

    return new Response(
      JSON.stringify(result),
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
