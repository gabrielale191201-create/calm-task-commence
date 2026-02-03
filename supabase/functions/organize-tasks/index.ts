import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation limits
const MAX_INPUT_LENGTH = 5000;
const MAX_TASKS_RETURNED = 100;

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

async function validateAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'Unauthorized' };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  
  if (error || !data?.claims) {
    return { userId: null, error: 'Invalid token' };
  }

  return { userId: data.claims.sub as string, error: null };
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate authentication
  const { userId, error: authError } = await validateAuth(req);
  if (authError || !userId) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Rate limiting per user
  if (isRateLimited(userId)) {
    console.log("Rate limited user:", userId);
    return new Response(
      JSON.stringify({ error: "rate_limited" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { input } = await req.json();
    
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere texto para organizar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log("Processing organize request for user:", userId);

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

    let organized;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        organized = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error - using fallback");
      const lines = input.split(/[,.\n]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      organized = { tasks: lines };
    }

    let tasks = Array.isArray(organized.tasks) ? organized.tasks : [];
    if (tasks.length > MAX_TASKS_RETURNED) {
      tasks = tasks.slice(0, MAX_TASKS_RETURNED);
    }

    return new Response(
      JSON.stringify({ tasks }),
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
