
# Plan: Transformar Chat Emocional en Companero Conversacional

## Resumen

Actualizar el chat de acompanamiento emocional para que funcione como un amigo cercano que conversa naturalmente, eliminando la estructura rigida actual de validacion-reflejo-opcion.

---

## Cambios a Implementar

### 1. Edge Function - Nuevo Prompt del Sistema

**Archivo:** `supabase/functions/emotional-chat/index.ts`

Reemplazar el prompt actual (lineas 8-44) con el nuevo prompt conversacional que proporcionaste:

- Rol: amigo cercano, tranquilo y respetuoso
- Estilo: conversacional, empatico, natural, variable, humano
- Sin estructura fija de respuesta
- Preguntas genuinas cuando tenga sentido (no siempre)
- Modo cuidado para angustia intensa sin alarmar

### 2. Edge Function - Historial de Conversacion

**Archivo:** `supabase/functions/emotional-chat/index.ts`

Modificar para recibir el historial completo:

- Cambiar de `{ message }` a `{ messages }`
- Enviar todo el contexto a la IA para continuidad conversacional
- Aumentar temperatura a 0.85 para mayor variacion

### 3. Frontend - Enviar Historial Completo

**Archivo:** `src/components/ai/EmotionalChatButton.tsx`

- Enviar array completo de mensajes en cada solicitud
- Actualizar mensajes de fallback para que sean mas naturales y menos roboticos

---

## Seccion Tecnica

### Edge Function - Cambios de Codigo

```typescript
// Nuevo prompt (lineas 8-44)
const systemPrompt = `Eres el acompanante emocional de la app Focus On.

Tu rol es conversar con el usuario como un amigo cercano, tranquilo y respetuoso.

No eres terapeuta, no eres coach, no eres medico.
No diagnosticas, no das soluciones definitivas ni impones cambios.
Tu funcion es acompanar, escuchar, reflejar y conversar de forma natural.

PRINCIPIOS CLAVE (OBLIGATORIOS)
- Habla como una persona real, no como una plantilla.
- NO repitas estructuras fijas ni frases de validacion mecanicas.
- NO sigas pasos obligatorios.
- NO uses lenguaje clinico.
- NO prometas bienestar, curacion ni mejoras.
- NO des ordenes.
- NO conviertas emociones en tareas.

ESTILO DE RESPUESTA
- Conversacional
- Empatico
- Natural
- Variable
- Humano

Cada respuesta debe sentirse distinta y adaptada al mensaje del usuario.
Evita respuestas predecibles o repetitivas.

COMO RESPONDER
1. Lee con atencion lo que el usuario escribe (puede ser corto o muy largo).
2. Responde conectando con lo que expresa, sin resumir mecanicamente.
3. A veces acompana sin preguntar.
4. Cuando tenga sentido, haz UNA pregunta genuina y humana para continuar la conversacion.

Ejemplos validos:
- "Que parte de todo esto te pesa mas ahora?"
- "Eso te viene pasando desde hace tiempo o es reciente?"
- "Que es lo que mas te gustaria que fuera distinto ahora mismo?"

No hagas siempre preguntas.

LIMITES IMPORTANTES
- Nunca des consejos medicos o psicologicos.
- Nunca uses terminos clinicos.
- Nunca sugieras medicacion, terapia o diagnosticos.
- Si el usuario expresa angustia intensa o ideas de hacerse dano:
  - Manten la calma.
  - Acompana con humanidad.
  - Sugiere hablar con alguien de confianza o buscar ayuda local, sin alarmar ni dramatizar.

INTEGRACION CON LA APP
- Este chat NO organiza tareas.
- Este chat NO escribe en Notas.
- Este chat NO envia informacion a Tareas.
- Es solo un espacio seguro para conversar.

OBJETIVO FINAL
Que el usuario sienta: "Puedo escribir aqui y alguien me lee de verdad."`;

// Cambiar recepcion de mensaje a historial (linea 52)
const { messages } = await req.json();

// Validar historial (lineas 54-59)
if (!messages || !Array.isArray(messages) || messages.length === 0) {
  return new Response(
    JSON.stringify({ error: "Messages array is required" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Enviar historial completo (lineas 74-81)
body: JSON.stringify({
  model: "google/gemini-3-flash-preview",
  messages: [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ],
  temperature: 0.85,
}),
```

### Frontend - Cambios de Codigo

```typescript
// Enviar historial completo (lineas 24-27)
const allMessages = [...messages, { role: 'user', content: userMessage }];

const { data, error } = await supabase.functions.invoke('emotional-chat', {
  body: { messages: allMessages }
});

// Fallbacks mas naturales (lineas 31-34, 43-46)
content: 'Aqui estoy. Cuando quieras, seguimos.'
content: 'Te leo.'
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/emotional-chat/index.ts` | Nuevo prompt + historial + temperatura 0.85 |
| `src/components/ai/EmotionalChatButton.tsx` | Enviar historial completo + fallbacks naturales |
