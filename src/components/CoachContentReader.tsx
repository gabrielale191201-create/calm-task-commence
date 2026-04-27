import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Dumbbell, Compass } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CoachContentReaderProps {
  open: boolean;
  onClose: () => void;
  content: CoachContent | null;
}

export interface CoachContent {
  cardTitle: string;
  essayTitle: string;
  category: string;
  readTime: string;
  paragraphs: string[];
}

const categoryIcon: Record<string, React.ElementType> = {
  'Lectura': BookOpen,
  'Ejercicio Guiado': Compass,
  'Ejercicio': Dumbbell,
  'Rutina Guiada': Compass,
};

export function CoachContentReader({ open, onClose, content }: CoachContentReaderProps) {
  if (!content) return null;
  const Icon = categoryIcon[content.category] || BookOpen;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl px-0 pb-0 border-t-0 bg-gradient-to-b from-card to-background">
        <SheetHeader className="px-6 pb-4 border-b border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="gap-1.5 text-[11px] font-medium tracking-wide uppercase">
              <Icon size={12} />
              {content.category}
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
              <Clock size={11} />
              {content.readTime}
            </Badge>
          </div>
          <SheetTitle className="text-xl font-display font-bold text-foreground leading-tight text-left">
            {content.essayTitle}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground text-left">
            De la colección: {content.cardTitle}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(92vh-140px)] px-6 py-6">
          <article className="max-w-lg mx-auto space-y-5">
            {content.paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-[15px] leading-[1.85] text-foreground/85 font-serif tracking-[0.01em]"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {p}
              </p>
            ))}
          </article>
          <div className="h-12" />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Content Library ──
export const coachContentLibrary: Record<string, CoachContent> = {
  '1': {
    cardTitle: 'El primer paso siempre duele',
    essayTitle: 'El primer paso siempre duele',
    category: 'Lectura',
    readTime: '8 min',
    paragraphs: [
      'Existe una mentira que todos hemos creído en algún momento: que para actuar primero necesitas sentirte listo. No es así. Nunca lo fue.',
      'La motivación no es el combustible que mueve la acción. Es al revés. La acción es lo que genera la motivación. Tu cerebro no quiere esforzarse — está diseñado para conservar energía. Cada vez que tienes algo difícil por delante, activa una alarma interna que traduce como "no tengo ganas". Eso no es debilidad. Es biología.',
      'Lo que hace la diferencia es entender que ese malestar es la señal correcta, no una razón para detenerte.',
      '"No actúas cuando te sientes listo. Te sientes listo cuando actúas."',
      'Existe un umbral. Un momento exacto entre el pensamiento y la acción donde tu cerebro puede sabotearte. Dura aproximadamente 5 segundos. Si en esos 5 segundos no te mueves, tu mente construirá un argumento perfecto para no hacerlo. Racionalizará, buscará alternativas, encontrará razones válidas.',
      'La solución no es ser más disciplinado. Es ser más rápido. Cuando aparezca la tarea que evitas, no pienses. Abre el documento. Pon el cronómetro. Escribe la primera oración. Lo que sea. Pero muévete antes de que los 5 segundos pasen. El movimiento, por pequeño que sea, rompe el patrón de parálisis.',
      'La razón por la que procrastinas no siempre es pereza. Muchas veces es porque la tarea que te pusiste es demasiado grande para tu estado actual. "Terminar el proyecto" no es una tarea — es un destino. "Abrir el documento y escribir el título" sí es una tarea.',
      'Cuando reduces el primer paso al tamaño correcto, tu cerebro deja de resistirse. Ya no percibe una amenaza — percibe algo manejable. Y lo manejable se hace. Focus On existe exactamente para esto: para que no tengas que decidir por dónde empezar.',
      'Tu acción de hoy: escoge la tarea que más has evitado esta semana. Reduce el primer paso hasta que sea ridículamente pequeño. Tan pequeño que no puedas decir que no. Ese es tu punto de entrada. Empieza en los próximos 5 minutos.',
    ],
  },
  '4': {
    cardTitle: 'La mente que no cede',
    essayTitle: 'La mente que no cede',
    category: 'Lectura',
    readTime: '12 min',
    paragraphs: [
      'La comodidad no te forma. La presión sí. No hablo de sufrimiento innecesario — hablo de ese momento exacto donde algo es difícil y tienes dos opciones: cedes o sigues.',
      'Lo que eliges en ese momento, repetido miles de veces a lo largo de tu vida, determina quién eres. No tus intenciones. No tus planes. Tus elecciones bajo presión. La buena noticia es que esa capacidad de no ceder no es un rasgo con el que naces. Es un músculo. Y como todo músculo, se entrena.',
      '"No eres lo que dices que vas a hacer. Eres lo que haces cuando tienes ganas de parar."',
      'Cuando algo se pone difícil, tu mente empieza a negociar. "Solo por hoy no importa." "Ya lo hago mañana." "No estoy en mi mejor momento." "Esto no vale la pena."',
      'Ese diálogo interno no es neutro. Es el enemigo más peligroso que tienes, porque habla con tu voz y conoce tus puntos débiles. Las personas mentalmente fuertes no lo tienen silenciado — lo tienen identificado. Saben que cuando aparece, es exactamente el momento de actuar. No después. Ahora.',
      'Cada vez que actúas a pesar del diálogo interno, lo debilitas. Cada vez que cedes, lo fortaleces. Así de simple. Así de brutal.',
      'Una de las confusiones más comunes: creer que las personas valientes no sienten miedo. Sí lo sienten. La diferencia es que actúan de todas formas. La fortaleza mental no es no sentir dudas, cansancio o incertidumbre. Es desarrollar la capacidad de hacer lo que necesitas hacer aunque todo eso esté presente.',
      'Eso se construye en lo pequeño. En hacer la tarea cuando no tienes ganas. En abrir Focus On cuando preferirías ver el teléfono. En completar el bloque de foco cuando a los 10 minutos ya quieres parar. Cada acción pequeña en la dirección correcta es un depósito en tu cuenta de fortaleza mental.',
      'Tu acción de hoy: identifica una cosa que has estado evitando porque se siente incómoda. No porque sea imposible — porque es incómoda. Hazlo. Solo esa cosa. La incomodidad dura minutos. La evasión dura semanas.',
    ],
  },
  '7': {
    cardTitle: 'Los que sí terminan',
    essayTitle: 'Los que sí terminan',
    category: 'Lectura',
    readTime: '15 min',
    paragraphs: [
      'Empezar es fácil. Todos empezamos cosas: dietas, proyectos, hábitos, negocios, cursos. La energía del inicio es real — la novedad motiva, la posibilidad emociona.',
      'El problema es el día 8. El día 15. El día donde ya no hay novedad, donde el progreso es invisible, donde la dificultad se vuelve real y la motivación inicial se ha evaporado. Ahí es donde se separan los que terminan de los que no. Y la diferencia no es talento ni suerte. Es un conjunto de comportamientos específicos que puedes aprender.',
      'Comportamiento 1: hacen el trabajo feo. Todo proyecto tiene una parte emocionante y una parte aburrida. La parte emocionante te hace empezar. La parte aburrida determina si terminas. Los que completan las cosas no evitan el trabajo feo: lo identifican, lo programan, lo hacen primero. Saben que si lo dejan para después, "después" nunca llega.',
      '"El éxito no está en la inspiración. Está en las horas que nadie ve, haciendo lo que nadie quiere hacer."',
      'Comportamiento 2: no dependen del estado de ánimo. "Hoy no me siento bien." "No estoy inspirado." "Mañana lo hago con más energía." Las personas que terminan las cosas han aprendido algo fundamental: el estado de ánimo es un mal jefe.',
      'No esperan sentirse bien para trabajar. Trabajan, y muchas veces el estado de ánimo mejora como consecuencia. El movimiento genera momentum, y el momentum genera motivación — no al revés. Desconectaron la producción del sentimiento. Producen en las buenas y en las malas. Eso, con el tiempo, los lleva donde quieren llegar.',
      'Comportamiento 3: tienen identidad, no solo metas. "Quiero terminar este proyecto" es una meta. "Soy alguien que termina lo que empieza" es una identidad. La diferencia es enorme.',
      'Cuando tu comportamiento está anclado a quién eres y no solo a lo que quieres, la consistencia cambia. Abandonar ya no es solo perder una oportunidad — es actuar en contra de tu identidad. Las personas que más producen no se motivan diciéndose lo que quieren lograr. Se motivan recordándose quiénes son.',
      'Tu acción de hoy: escribe esta frase en algún lugar donde la veas: "Soy alguien que termina lo que empieza." No es afirmación vacía — es una declaración de identidad. Cada vez que eliges trabajar cuando no tienes ganas, estás siendo fiel a esa identidad. Empieza hoy.',
    ],
  },
  '3': {
    cardTitle: 'Disciplina Implacable',
    essayTitle: 'La Ilusión de la Motivación y el Despertar del 40%',
    category: 'Lectura',
    readTime: '6 min',
    paragraphs: [
      'La mentira más grande que te ha vendido la industria del desarrollo personal es que necesitas "sentirte motivado" para actuar. La motivación es una emoción, y como toda emoción, es volátil. Te abandona el día que llueve, el día que duermes mal o el día que las cosas se ponen difíciles. Construir tu imperio basándote en la motivación es como construir una casa sobre arena.',
      'La disciplina implacable, por el contrario, es fría, calculada y no negocia. Es la capacidad de disociar lo que sientes de lo que haces. Cuando tu alarma suena a las 5:00 AM, tu cerebro primitivo te ruega que te quedes en la cama. Ese cerebro está programado para conservar energía. Pero aquí está el secreto que usan las fuerzas especiales de élite: cuando sientes que has llegado a tu límite absoluto, a ese punto donde crees que tu mente y tu cuerpo no dan más, en realidad solo has agotado el 40% de tu capacidad.',
      'Esa fatiga es un "regulador central", un mecanismo de defensa falso. Queda un 60% de reserva en tu tanque.',
      'Los amateurs se detienen cuando duele. Los profesionales entienden que el dolor es solo el punto de partida. La próxima vez que estés haciendo Focus Time y la fricción mental te empuje a revisar el celular o abandonar la tarea, sonríe. Acabas de llegar a tu 40%. Oblígate a dar 15 minutos más. Rompe el regulador. Así es como se forja una mente inquebrantable: no esperando a tener ganas, sino ejecutando con una precisión letal exactamente cuando menos quieres hacerlo.',
    ],
  },
  '8': {
    cardTitle: 'Control Total de tu Día',
    essayTitle: 'Soberanía del Tiempo y Arquitectura de Sistemas',
    category: 'Lectura',
    readTime: '7 min',
    paragraphs: [
      'Tú no te elevas al nivel de tus metas; caes al nivel de tus sistemas. Puedes tener el objetivo de ser el emprendedor más exitoso, de sacar las mejores notas o de construir el mejor software, pero si tu sistema diario consiste en despertar, revisar redes sociales y reaccionar a las urgencias de los demás, tu día ya no te pertenece. Eres un rehén de la agenda del mundo.',
      'Tener el "Control Total" no significa hacer más cosas en menos tiempo; significa hacer menos cosas, pero que sean las correctas. Se llama Esencialismo. Vivimos en una sociedad adicta a la ocupación falsa. Responder correos y organizar notas te hace sentir productivo, pero es trabajo superficial. El progreso real ocurre en el Trabajo Profundo: bloques de 90 minutos de concentración ininterrumpida, sin celular, sin notificaciones, empujando tus capacidades cognitivas al máximo.',
      'Para recuperar tu soberanía, debes auditar tu entorno. La fuerza de voluntad siempre pierde contra un entorno diseñado para la distracción. Si tu celular está en tu escritorio, ya perdiste. Si tienes 15 pestañas abiertas, tu enfoque está fragmentado.',
      'Desde hoy, tu día se controla la noche anterior. Nunca te despiertes sin saber cuál es "La Roca" (tu tarea esencial). Cuando te sientas a trabajar, el diseño de tu entorno debe hacer que la procrastinación sea casi imposible. Cierra la puerta. Apaga el ruido. Ejecuta tu Roca antes de que el mundo despierte. Quien controla su mañana, controla su vida.',
    ],
  },
  '2': {
    cardTitle: 'Reseteo de 5 Minutos',
    essayTitle: 'Inmersión en el Punto Cero (Trascendencia del Estrés)',
    category: 'Ejercicio Guiado',
    readTime: '5 min',
    paragraphs: [
      '(Lee este ejercicio lentamente. Aléjate de la pantalla de tu computadora. Adopta una postura digna, con la columna recta, y cierra los ojos suavemente).',
      'El tiempo es una ilusión que genera ansiedad. El estrés que sientes en el pecho no proviene de este milisegundo; proviene de tu mente proyectándose hacia un futuro incierto o arrastrando el peso de un pasado inalterable. Vamos a devolverte al único lugar donde tienes verdadero poder: el Aquí y el Ahora.',
      'Toma una inhalación profunda y lenta por la nariz. Siente cómo el aire frío entra y expande tu diafragma... Uno... Dos... Tres... Cuatro. Retén el aire. Siente esa plenitud. Ahora, exhala por la boca como si soplaras a través de un sorbete, soltando toda la tensión de tus hombros, tu mandíbula y tu frente... Uno... Dos... Tres... Cuatro... Cinco... Seis.',
      'Imagina que tu conciencia es el cielo azul, vasto e infinito. Tus pensamientos, la presión de tus tareas y tus urgencias son solo nubes pasando. Tú no eres las nubes. No intentes detenerlas ni pelear contra ellas. Solo obsérvalas pasar. Eres el testigo silencioso.',
      'En este espacio de quietud absoluta, tu sistema nervioso parasimpático se está reiniciando. El cortisol desciende. Estás a salvo. En este punto cero, no hay plazos que cumplir ni expectativas que llenar. Solo existe la pura existencia.',
      'Mantén esta paz durante tres respiraciones más. Siente cómo la claridad inunda tu mente. Cuando estés listo para regresar, abre los ojos lentamente. Trae esta quietud contigo y dirige tu energía como un láser hacia tu siguiente tarea.',
    ],
  },
  '5': {
    cardTitle: 'Elimina el Ruido Mental',
    essayTitle: 'Anclaje Sensorial y Protocolo de Vaciado',
    category: 'Ejercicio',
    readTime: '4 min',
    paragraphs: [
      'La saturación mental ocurre cuando tu memoria de trabajo colapsa. Intentar retener 5 problemas, 3 ideas y 2 preocupaciones al mismo tiempo crea una tormenta de "ruido" que paraliza la ejecución. Para eliminar el ruido, debemos sacar las ideas de la mente y anclar el cuerpo al mundo físico.',
      'Fase 1: El Anclaje (Grounding) — 1 minuto. Tu mente está acelerada; oblígala a frenar usando tus sentidos.',
      'Mira a tu alrededor y nombra mentalmente 3 cosas físicas que veas (ej. la textura de la mesa, el color de la pared, un bolígrafo). Míralas a detalle.',
      'Nombra 2 cosas que puedas tocar ahora mismo. Siente su temperatura y su peso en tus manos.',
      'Nombra 1 cosa que puedas escuchar (el zumbido de la laptop, los autos afuera, tu propia respiración). Acabas de hackear tu cerebro, sacándolo del bucle de ansiedad y forzándolo a procesar el momento presente.',
      'Fase 2: La Extracción — 3 minutos. El ruido no se elimina ignorándolo, se elimina externalizándolo. Ve a la herramienta de "Desbloqueo Mental" de esta app. Tienes permiso para ser caótico. Escribe absolutamente todo lo que está dando vueltas en tu cabeza. Vomita las tareas pendientes, las ansiedades y las obligaciones. No lo filtres. Cuando lo ves en texto, el monstruo abstracto de tu mente se convierte en una simple lista de píxeles. El ruido ha desaparecido; ahora solo queda el trabajo.',
    ],
  },
  '6': {
    cardTitle: 'Ritual de Enfoque Diario',
    essayTitle: 'Protocolo de Ignición para el Estado de Flujo',
    category: 'Rutina Guiada',
    readTime: '10 min',
    paragraphs: [
      'El "Flow State" (Estado de Flujo) es el pico máximo del rendimiento humano. Es ese momento mágico donde el mundo desaparece, el tiempo se deforma y tu productividad se multiplica por cinco. No puedes forzar el estado de flujo, pero puedes construir la pista de aterrizaje perfecta para que llegue. Ejecuta este ritual de 4 pasos antes de tu sesión de trabajo más pesada.',
      'Minuto 1-2: Aislamiento Táctico. La atención es tu activo más valioso; protégelo agresivamente. Toma tu celular, ponlo en modo avión y escóndelo físicamente en otra habitación o dentro de un cajón. Cierra todas las pestañas de tu navegador que no tengan que ver con la tarea actual. La fricción para distraerte debe ser extrema.',
      'Minuto 3-5: Arquitectura del Objetivo. No puedes darle a un blanco que no ves. ¿Cuál es el resultado exacto que buscas en los próximos 90 minutos? No digas "avanzar en el proyecto". Di: "Escribir 500 palabras del reporte" o "Terminar el diseño de la pantalla principal". Sé quirúrgico. Escribe ese micro-objetivo en un papel y ponlo frente a ti.',
      'Minuto 6-8: Preparación Neuroquímica. Bebe un vaso entero de agua para hidratar tu cerebro. Si tomas café, tenlo listo. Realiza 10 respiraciones profundas y rápidas para elevar tus niveles de oxígeno y noradrenalina, aumentando tu nivel de alerta.',
      'Minuto 9-10: El Salto al Vacío. Presiona "Iniciar Focus Time" en la app. Al empezar, sentirás una resistencia natural. Tu cerebro te dirá que hagas algo más fácil. Ignóralo. Esa fricción inicial es solo tu mente calentando los motores. Oblígate a mantener los ojos en la pantalla y las manos en el teclado durante los primeros 15 minutos sin parar. Una vez superada esa barrera, el Estado de Flujo te atrapará. Entra en la zona.',
    ],
  },
};
