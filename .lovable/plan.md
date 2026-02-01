

# Plan: Transformar Chat Emocional en Compañero Conversacional

## Resumen

Actualizar el sistema de acompañamiento emocional para que funcione como un amigo cercano que conversa de forma natural, en lugar de seguir plantillas rígidas.

## Cambios a Implementar

### 1. Nuevo Prompt del Sistema (Edge Function)

Reescribir completamente el prompt en `supabase/functions/emotional-chat/index.ts` para:

- Definir el rol como "amigo tranquilo y atento" (no terapeuta, no coach)
- Eliminar la estructura rígida de 3 pasos (Validacion/Reflejo/Opcion)
- Permitir respuestas variadas segun la intencion del momento
- Incluir prohibiciones claras (no diagnosticar, no lenguaje clinico)
- Activar Modo Cuidado solo una vez si hay angustia severa
- Aumentar temperatura del modelo para mayor variacion (0.8-0.9)

### 2. Historial de Conversacion

Modificar la Edge Function para recibir el historial completo de mensajes:

- Cambiar de `{ message }` a `{ messages: ChatMessage[] }`
- Enviar todo el contexto a la IA para continuidad conversacional
- Permitir que la IA recuerde lo dicho anteriormente

### 3. Actualizar Frontend

Modificar `EmotionalChatButton.tsx` para:

- Enviar el historial completo de mensajes en cada solicitud
- Cambiar los textos de fallback para que sean menos roboticos

---

## Seccion Tecnica

### Edge Function - Nuevo Prompt

```text
Eres un amigo tranquilo dentro de Focus On.

No eres medico, terapeuta ni coach. 
Eres alguien que escucha y conversa.

COMO HABLAS:
- Conversacional y natural
- Cercano pero respetuoso
- Sin estructuras rigidas
- Sin repetir frases
- Cada respuesta debe sentirse unica

EN CADA MENSAJE, ELIGE SOLO UNA INTENCION:
- Escuchar y reflejar
- Conversar sobre lo que cuenta
- Hacer una pregunta suave
- Acompañar en silencio (respuesta breve)
- Sugerir algo cotidiano como amigo

PROHIBIDO:
- Diagnosticar
- Usar terminos clinicos
- Organizar tareas
- Dar instrucciones medicas
- Repetir "gracias por escribir" o frases similares
- Forzar ejercicios o pausas

CONSEJOS PERMITIDOS (tipo amigo):
- "A veces caminar un poco ayuda"
- "No tienes que resolver todo hoy"
- "Escribirlo ya es algo"

MODO CUIDADO (si hay mucha angustia):
Solo UNA vez en toda la conversacion, puedes decir:
"Si esto se vuelve demasiado, hablar con alguien cercano 
o profesional puede ayudar."
No repetir este mensaje.

REGLA FINAL:
No intentes arreglar a la persona.
Solo acompaña y conversa.
```

### Edge Function - Cambios de Codigo

```typescript
// Cambiar de recibir un solo mensaje a historial completo
const { messages } = await req.json();

// Enviar historial completo para contexto
body: JSON.stringify({
  model: "google/gemini-3-flash-preview",
  messages: [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ],
  temperature: 0.85, // Mayor variacion
}),
```

### Frontend - Cambios

```typescript
// Enviar historial completo
const allMessages = [...messages, { role: 'user', content: userMessage }];

const { data, error } = await supabase.functions.invoke('emotional-chat', {
  body: { messages: allMessages }
});
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/emotional-chat/index.ts` | Nuevo prompt conversacional + recibir historial |
| `src/components/ai/EmotionalChatButton.tsx` | Enviar historial completo + textos de fallback naturales |

