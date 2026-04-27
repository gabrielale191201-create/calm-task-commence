import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Star, Sparkles, BookOpen, Quote, Target, ListChecks, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentSection {
  type: 'cover' | 'chapter' | 'quote' | 'exercise' | 'closing' | 'list';
  title?: string;
  subtitle?: string;
  body?: string;
  quote?: string;
  author?: string;
  steps?: string[];
  items?: string[];
  action?: string;
}

export interface CoachContent {
  id: string;
  title: string;
  category: string;
  readTime: string;
  color: string;
  subtitle: string;
  icon: string;
  sections: ContentSection[];
}

export const coachContentLibrary: Record<string, CoachContent> = {
  '1': {
    id: '1',
    title: 'El Primer Paso Siempre Duele',
    category: 'Foco',
    readTime: '10 min',
    color: 'from-orange-500 via-red-500 to-rose-600',
    subtitle: 'Por qué arrancar es lo más difícil y cómo hacerlo de todas formas',
    icon: '🔥',
    sections: [
      { type: 'cover', title: 'El Primer Paso\nSiempre Duele', subtitle: 'Por qué arrancar es lo más difícil y cómo hacerlo de todas formas' },
      { type: 'chapter', title: 'El mito de la motivación', body: `Existe una mentira que todos hemos creído en algún momento: que para actuar primero necesitas sentirte listo. Que la motivación llega antes que la acción. Que si esperas el momento correcto, eventualmente algo en tu interior se va a encender y todo va a fluir.\n\nNo es así. Nunca lo fue.\n\nLa motivación no es el combustible que mueve la acción. Es exactamente al revés. La acción es lo que genera la motivación. Tu cerebro no quiere esforzarse —está diseñado evolutivamente para conservar energía. Cada vez que tienes algo difícil por delante, activa una alarma interna que traduce como "no tengo ganas", "no es el momento", "mañana lo hago con más energía".\n\nEso no es debilidad de carácter. Es biología.\n\nEl problema no es que tu cerebro lo haga. El problema es que le crees.\n\nPiénsalo así: si esperaras a tener ganas de ir al gimnasio, de estudiar, de trabajar en ese proyecto importante, de tener conversaciones difíciles —¿cuántas veces lo hubieras hecho este mes? Las personas más productivas que conoces no tienen más motivación que tú. Tienen menos dependencia de ella.` },
      { type: 'quote', quote: 'No actúas cuando te sientes listo.\nTe sientes listo cuando actúas.', author: 'Focus On' },
      { type: 'chapter', title: 'Tu cerebro te está mintiendo', body: `Cuando evitas una tarea, sientes un alivio inmediato. Ese alivio es real. Tu sistema nervioso literalmente se relaja cuando pospones algo que te genera tensión. El problema es que ese alivio dura minutos. La tarea sigue ahí.\n\nY cada vez que la evitas, ocurre algo insidioso: la tarea se vuelve más grande en tu mente. Lo que originalmente era "responder ese correo difícil" se convierte en "el correo que tengo pendiente desde hace días y que definitivamente habrá consecuencias".\n\nTu cerebro ha tomado un hecho simple y lo ha convertido en una amenaza.\n\nLos psicólogos llaman a esto "inflación de la tarea". Entre más la evitas, más amenazante se siente. Y entre más amenazante se siente, más la evitas. Es un ciclo que se retroalimenta solo.\n\nLa única salida es la acción. No una gran acción heroica. Una pequeña, ridículamente pequeña si es necesario.\n\nPorque aquí está lo que nadie te dice: la tarea real casi nunca es tan difícil como la versión que construiste en tu cabeza durante los días que la evitaste.` },
      { type: 'chapter', title: 'Los 5 segundos que lo cambian todo', body: `Existe un umbral. Un momento exacto entre el pensamiento y la acción donde tu cerebro puede sabotearte.\n\nDura aproximadamente cinco segundos.\n\nSi en esos cinco segundos no te mueves hacia la acción, tu mente construirá un argumento perfecto para no hacerlo. Racionalizará, buscará alternativas, encontrará razones válidas y aparentemente lógicas. Tu cerebro es brillante para justificar la inacción —y lo hace usando tu propia voz, con tus propios argumentos.\n\nCuando aparezca la tarea que evitas, no pienses. No evalúes. No te preguntes si tienes ganas. Abre el documento. Pon el cronómetro. Escribe la primera oración. Lo que sea. Pero muévete antes de que los cinco segundos pasen.\n\nEl movimiento, por pequeño que sea, rompe el patrón de parálisis. Y una vez roto, el impulso llega solo.` },
      { type: 'list', title: 'Señales de que estás en modo parálisis', items: ['Estás "preparando" la tarea sin hacer la tarea', 'Reorganizas tu lista de pendientes en lugar de ejecutar', 'Buscas más información cuando ya tienes suficiente', 'Esperas el "momento correcto" que nunca llega', 'Haces tareas pequeñas para sentirte productivo evitando la importante', 'Tu descripción mental de la tarea es más larga que la tarea misma'] },
      { type: 'chapter', title: 'El tamaño del primer paso importa', body: `La razón por la que procrastinas no siempre es pereza. Muchas veces es porque la tarea que te pusiste es demasiado grande para tu estado actual.\n\n"Terminar el proyecto" no es una tarea. Es un destino.\n"Escribir el primer párrafo" es una tarea.\n"Abrir el documento y darle nombre" también es una tarea.\n\nCuando reduces el primer paso al tamaño correcto, algo cambia en tu cerebro. Ya no percibe una amenaza —percibe algo manejable. Y lo manejable se hace.\n\nExiste un concepto llamado "par mínimo de acción". Es la versión más pequeña posible de una tarea que aún cuenta como progreso real. Para escribir: abrir el documento y escribir una frase. Para ejercitarse: ponerse la ropa deportiva. Para el proyecto difícil: abrir el archivo donde guardas el trabajo.\n\nEl truco está en que una vez que empiezas, el umbral de resistencia cae dramáticamente. Seguir es mucho más fácil que empezar.\n\nFocus On existe exactamente para esto: para que no tengas que decidir por dónde empezar. Tú escribes lo que tienes en mente. La IA encuentra el primer paso real. Tú solo tienes que ejecutar.` },
      { type: 'quote', quote: 'La tarea más difícil no es la más larga.\nEs la que llevas más tiempo evitando.', author: 'Focus On' },
      { type: 'closing', title: 'Lo que haces ahora', action: 'Escoge la tarea que más has evitado esta semana. No la más urgente. La que más has estado evitando. Ahora reduce el primer paso hasta que sea ridículamente pequeño. Tan pequeño que no puedas decir que no. Ese es tu punto de entrada. Tienes cinco segundos. Empieza.' },
    ],
  },
  '2': {
    id: '2',
    title: 'Reseteo de 5 Minutos',
    category: 'Foco',
    readTime: '6 min',
    color: 'from-sky-500 via-blue-500 to-indigo-600',
    subtitle: 'Un ejercicio para volver al presente cuando todo colapsa',
    icon: '⏱️',
    sections: [
      { type: 'cover', title: 'Reseteo de\n5 Minutos', subtitle: 'Un ejercicio para volver al presente cuando todo colapsa' },
      { type: 'chapter', title: 'Cuando el día te desborda', body: `Hay momentos en el día donde sientes que tu mente va a estallar. Demasiadas cosas al mismo tiempo, demasiadas conversaciones abiertas, demasiadas decisiones tomadas, demasiado ruido acumulado.\n\nNo es ansiedad clínica. Es el resultado natural de una mente que no ha tenido un momento para procesar.\n\nEstamos diseñados para funcionar en ciclos. Los investigadores del sueño descubrieron que durante el día, nuestro cerebro opera en ciclos de aproximadamente 90 minutos de alta concentración, seguidos de períodos donde necesita recuperarse. Ignoramos esos períodos. Tomamos café y seguimos adelante. Y el costo se acumula.\n\nEl reseteo de 5 minutos no es meditación. No requiere experiencia previa ni posición específica. Es una intervención directa sobre tu sistema nervioso que puedes hacer en cualquier momento y lugar.\n\nÚsalo cuando sientas que tu mente va a mil. Cuando llevas horas mirando la pantalla sin ver realmente. Cuando la ansiedad está subiendo. Cuando sientes que trabajas pero no avanzas.` },
      { type: 'chapter', title: 'Por qué funciona la respiración', body: `Tu respiración es el único sistema automático de tu cuerpo que también puedes controlar conscientemente. Eso la hace única.\n\nCuando estás bajo estrés, tu respiración se vuelve corta y superficial. Esto envía señales al cerebro de que hay peligro. El cerebro responde activando más el sistema de alarma. Es un ciclo que se retroalimenta.\n\nCuando controlas tu respiración deliberadamente —especialmente alargando la exhalación— activas el sistema nervioso parasimpático. El que se encarga de la calma. El cerebro recibe la señal de que el peligro pasó.\n\nNo es magia. Es fisiología.\n\nLa exhalación larga es clave. Una respiración donde exhalas el doble de lo que inhalas activa el nervio vago, que regula directamente tu frecuencia cardíaca y tu nivel de alerta. Basta con tres respiraciones de este tipo para medir cambios reales en el cuerpo.\n\nTres respiraciones. Menos de dos minutos. Resultados medibles.` },
      { type: 'exercise', title: 'El Reseteo — Paso a Paso', steps: ['PARA completamente. Cierra lo que estabas haciendo. Aleja el teléfono. Este momento existe solo para ti y dura cinco minutos.', 'RESPIRA: Inhala lento por 4 segundos contando mentalmente. Retén el aire 2 segundos. Exhala despacio por 6-8 segundos. Repite este ciclo exactamente 5 veces. No pienses en nada más.', 'OBSERVA sin juzgar. ¿Qué está pasando en tu cuerpo ahora mismo? ¿Tensión en los hombros? ¿Mandíbula apretada? ¿Pecho cerrado? Solo nómbralo mentalmente. No tienes que resolverlo.', 'SUELTA lo que ya pasó. Dite esto en voz baja: "Ese momento ya pasó. Lo que sigue empieza ahora." No es positivismo barato. Es la verdad. El estrés del momento anterior no define el siguiente.', 'ELIGE UNA COSA. Antes de abrir los ojos, decide con claridad qué vas a hacer cuando termines. Solo una cosa. Ese es tu foco. El resto puede esperar.'] },
      { type: 'quote', quote: 'No puedes controlar lo que ya pasó.\nSí puedes controlar lo que haces\nen los próximos cinco minutos.', author: 'Focus On' },
      { type: 'closing', title: 'Ahora mismo', action: 'Haz el reseteo ahora. No "más tarde cuando tenga tiempo". Ahora. Son cinco minutos. Cuando termines, abre Focus On y escribe esa única cosa que decidiste hacer. El reseteo solo funciona si viene seguido de acción concreta.' },
    ],
  },
  '3': {
    id: '3',
    title: 'Disciplina Implacable',
    category: 'Mentalidad',
    readTime: '8 min',
    color: 'from-purple-500 via-violet-500 to-indigo-600',
    subtitle: 'No necesitas fuerza de voluntad. Necesitas un sistema.',
    icon: '🛡️',
    sections: [
      { type: 'cover', title: 'Disciplina\nImplacable', subtitle: 'No necesitas fuerza de voluntad. Necesitas un sistema.' },
      { type: 'chapter', title: 'La mentira de la fuerza de voluntad', body: `Durante años te dijeron que el éxito era cuestión de esfuerzo y fuerza de voluntad. Que si no lograbas algo era porque no querías lo suficiente, porque eras débil, porque te faltaba carácter.\n\nEso es falso. Y no solo falso —es dañino.\n\nLa fuerza de voluntad es un recurso limitado. Se agota durante el día como la batería de un teléfono. Los estudios del psicólogo Roy Baumeister lo demostraron repetidamente: tomamos decisiones de peor calidad hacia el final del día no porque seamos menos inteligentes —sino porque ese recurso se ha consumido resistiendo tentaciones y resolviendo problemas desde la mañana.\n\nLos jueces toman decisiones más favorables al inicio del día. Los cirujanos cometen más errores en la tarde. Los estudiantes rinden peor en los exámenes vespertinos.\n\nNo es falta de profesionalismo. Es agotamiento del recurso.\n\nLas personas más disciplinadas que conoces no tienen más fuerza de voluntad. Han construido mejores sistemas. Han diseñado su entorno para que la acción correcta sea la más fácil.` },
      { type: 'quote', quote: 'No te falta fuerza de voluntad.\nTe falta un sistema que no la necesite.', author: 'Focus On' },
      { type: 'chapter', title: 'Qué es realmente un sistema', body: `Un sistema no es una lista de reglas. No es una tabla de hábitos con colores. No es un calendario perfectamente planificado que abandonas en el tercer día.\n\nUn sistema es una serie de decisiones tomadas por adelantado para que no tengas que decidir en el momento.\n\nCuando decides la noche anterior qué vas a hacer mañana, estás usando un sistema. Cuando tienes tus tres prioridades del día antes de abrir el correo, estás usando un sistema. Cuando usas Focus Time para ejecutar en bloques definidos, estás usando un sistema.\n\nLa diferencia entre alguien que "tiene disciplina" y alguien que no, casi siempre se reduce a esto: uno ha tomado decisiones por adelantado, el otro improvisa todo el día.\n\nLas decisiones improvisadas bajo presión casi siempre llevan al camino de menor resistencia. El camino de menor resistencia rara vez es el más productivo.\n\nLos sistemas eliminan la fricción. Hacen que lo correcto sea automático.` },
      { type: 'chapter', title: 'Diseña tu entorno antes de necesitar disciplina', body: `James Clear describe un principio que cambia todo: la facilidad de un comportamiento determina su frecuencia, no el deseo de hacerlo.\n\n¿Quieres leer más? Pon el libro en tu almohada, no en el estante.\n¿Quieres comer mejor? Pon la fruta al frente del refrigerador.\n¿Quieres trabajar sin distracciones? Bloquea las apps antes de necesitar la fuerza de voluntad para resistirlas.\n\nEsto parece simple porque lo es. Pero la mayoría de las personas sigue luchando contra su entorno en lugar de diseñarlo.\n\nCada vez que tienes que resistir activamente una tentación estás gastando el recurso limitado de la fuerza de voluntad. Y ese recurso se acaba.\n\nEn lugar de ser más fuerte, sé más inteligente. Diseña el entorno. Toma las decisiones difíciles cuando tienes energía y claridad. Que cuando llegues al momento crítico, la opción correcta sea la que está justo enfrente.` },
      { type: 'list', title: 'El sistema mínimo que funciona', items: ['Cada mañana: define tus 3 tareas más importantes antes de revisar mensajes', 'Cada mañana: decide cuándo vas a hacer la más importante y bloquea ese tiempo', 'Antes de cada bloque de trabajo: pon el teléfono en modo avión o silencio', 'Cada noche: revisa qué completaste y prepara el día siguiente en 5 minutos', 'Cada semana: revisa si el sistema está funcionando y ajusta lo que no sirve'] },
      { type: 'chapter', title: 'La identidad que sostiene todo', body: `Los sistemas necesitan una base. Y la base más sólida no es la motivación ni la disciplina. Es la identidad.\n\nCuando tu comportamiento está anclado a quién eres y no solo a lo que quieres lograr, la consistencia cambia radicalmente.\n\n"Quiero ser más productivo" es una meta. Se puede abandonar.\n"Soy alguien que respeta su tiempo" es una identidad. Es más difícil de traicionar.\n\nCada vez que usas el sistema, cada vez que sigues el proceso aunque sea incómodo, estás votando por la versión de ti que quieres ser. Y con suficientes votos, esa versión se convierte en la real.\n\nLa disciplina implacable no viene de esforzarse más. Viene de haber construido una identidad tan clara que la inacción se siente incongruente con quién eres.` },
      { type: 'quote', quote: 'No eres lo que planeas ser.\nEres lo que haces cuando nadie mira.', author: 'Focus On' },
      { type: 'closing', title: 'Tu primer paso de sistema', action: 'Esta noche, antes de dormir, escribe en Focus On tus tres tareas más importantes de mañana. Decide cuándo vas a hacer la primera. Solo eso. Esa es la decisión más importante que puedes tomar hoy para mañana.' },
    ],
  },
  '4': {
    id: '4',
    title: 'La Mente Que No Cede',
    category: 'Mentalidad',
    readTime: '12 min',
    color: 'from-emerald-500 via-teal-500 to-cyan-600',
    subtitle: 'Cómo desarrollar la fortaleza mental que nadie te enseñó',
    icon: '🧠',
    sections: [
      { type: 'cover', title: 'La Mente\nQue No Cede', subtitle: 'Cómo desarrollar la fortaleza mental que nadie te enseñó' },
      { type: 'chapter', title: 'La presión revela quién eres', body: `La comodidad no te forma. La presión sí.\n\nNo hablo de sufrimiento innecesario. Hablo de ese momento exacto donde algo es difícil, donde quieres parar, donde el camino más fácil es ceder —y tienes que elegir.\n\nLo que eliges en ese momento, repetido miles de veces a lo largo de tu vida, determina quién eres. No tus intenciones. No tus planes. Tus elecciones bajo presión.\n\nLos atletas de élite hablan de algo que llaman "momento de la verdad". El kilómetro 35 de un maratón. Los últimos minutos de un partido agotador. Ese punto donde el cuerpo pide parar y solo la mente puede seguir.\n\nPero los momentos de verdad no son exclusivos del deporte. El quinto día de una dieta difícil. La tercera semana de un proyecto que perdió el entusiasmo. La tarea que requiere concentración cuando todo en ti preferiría hacer cualquier otra cosa.\n\nEsos son tus momentos de verdad. Y la fortaleza mental no es un rasgo de personalidad con el que naces. Es un músculo. Y como todo músculo, se entrena.` },
      { type: 'quote', quote: 'No eres lo que dices que vas a hacer.\nEres lo que haces cuando tienes ganas de parar.', author: 'Focus On' },
      { type: 'chapter', title: 'El enemigo más peligroso', body: `Cuando algo se pone difícil, tu mente empieza a negociar. No con alguien externo. Contigo mismo.\n\n"Solo por hoy no importa."\n"Ya lo hago mañana con más energía."\n"No estoy en mi mejor momento."\n"Esto no vale la pena."\n\nEse diálogo interno no es neutro. Es tu enemigo más peligroso, porque habla con tu voz, conoce tus puntos débiles, y siempre tiene un argumento adaptado específicamente a ti.\n\nLo que hace diferente a las personas mentalmente fuertes no es que no tienen ese diálogo. Es que lo han identificado. Saben reconocer su patrón. Y saben que cuando aparece con mayor intensidad, es exactamente el momento de actuar.\n\nNo después. No cuando pase. Ahora.\n\nCada vez que actúas a pesar del diálogo interno, lo debilitas. Cada vez que cedes, lo fortaleces. Así de simple. Así de brutal.` },
      { type: 'chapter', title: 'Fortaleza no es ausencia de miedo', body: `Una de las confusiones más comunes sobre la fortaleza mental es creer que las personas valientes no sienten miedo, duda ni cansancio.\n\nSí los sienten. Exactamente igual que tú.\n\nLa diferencia es que actúan de todas formas. No porque el miedo desaparezca. Sino porque han aprendido que el miedo no es una señal de "no hagas esto". Es simplemente una señal de que algo importa.\n\nCuando tu mente dice que ya llegaste al límite, en realidad probablemente solo has usado una fracción de tu capacidad real. El resto está bloqueado como mecanismo de protección.\n\nNo tienes que llegar a ningún extremo para aplicar este principio. Solo necesitas saber que cuando sientes que ya no puedes más, probablemente te queda mucho más de lo que crees.\n\nLa fortaleza mental se construye exactamente en ese momento. No en los momentos fáciles. En el momento donde todo en ti quiere parar y decides dar un paso más.` },
      { type: 'list', title: 'Cómo entrenar la fortaleza mental en lo cotidiano', items: ['Haz la tarea más difícil primero, antes de las más fáciles', 'Cuando quieras parar, comprométete a cinco minutos más antes de decidir', 'Cumple los compromisos que te haces a ti mismo, especialmente cuando nadie mira', 'Identifica y nombra el diálogo interno cuando aparece para quitarle poder', 'Lleva registro de las veces que actuaste a pesar de no querer hacerlo'] },
      { type: 'chapter', title: 'La consistencia como entrenamiento', body: `Los deportistas no entrenan solo para una competencia. Entrenan porque el entrenamiento mismo los forma.\n\nLa consistencia en lo pequeño es tu entrenamiento de fortaleza mental.\n\nCuando completas el bloque de Focus Time aunque a los diez minutos ya quieres parar, estás entrenando. Cuando cumples la promesa que te hiciste aunque nadie se entere, estás entrenando. Cuando haces la llamada difícil que llevas días postergando, estás entrenando.\n\nCada acción pequeña en la dirección correcta, tomada especialmente cuando no tienes ganas, es un depósito en tu cuenta de fortaleza mental. Y esa cuenta genera interés compuesto.\n\nNo necesitas grandes gestos heroicos. Necesitas pequeñas elecciones correctas repetidas con consistencia.\n\nCon el tiempo, la mente que una vez cedía en los momentos difíciles se convierte en la mente que no cede.` },
      { type: 'quote', quote: 'La fortaleza no se declara.\nSe demuestra en silencio,\nen los momentos donde nadie mira.', author: 'Focus On' },
      { type: 'closing', title: 'Tu entrenamiento de hoy', action: 'Identifica una cosa que has estado evitando porque se siente incómoda. No imposible. Incómoda. Ese es exactamente el ejercicio. Hazla hoy. La incomodidad dura minutos. El orgullo de haberla hecho dura días. La evasión sostenida construye una versión más débil de ti.' },
    ],
  },
  '5': {
    id: '5',
    title: 'Elimina el Ruido Mental',
    category: 'Hábitos',
    readTime: '5 min',
    color: 'from-amber-400 via-orange-500 to-red-500',
    subtitle: 'Un ejercicio para vaciar la mente y entrar en modo ejecución',
    icon: '✨',
    sections: [
      { type: 'cover', title: 'Elimina el\nRuido Mental', subtitle: 'Un ejercicio para vaciar la mente y entrar en modo ejecución' },
      { type: 'chapter', title: 'Por qué tu mente no para', body: `El ruido mental no es un problema de carácter. Es un problema de espacio —o más precisamente, de falta de él.\n\nTu cerebro tiene una memoria de trabajo limitada. Los investigadores estiman que puede manejar simultáneamente entre cuatro y siete elementos de información. Cuando tienes más que eso flotando sin resolver, el sistema empieza a fallar.\n\nEl resultado: saltas de pensamiento en pensamiento sin terminar ninguno. Te cuesta concentrarte. Sientes que trabajas pero no avanzas. La ansiedad sube sin una razón concreta.\n\nNo es que algo esté mal contigo. Es que tu sistema cognitivo está sobrecargado.\n\nLa solución no es meditar durante horas ni vaciar la mente de pensamientos. Es sacar lo que está adentro hacia afuera. Tu mente no está diseñada para almacenar información —está diseñada para procesarla.` },
      { type: 'exercise', title: 'El Vaciado Mental — 4 Pasos', steps: ['DESCARGA (2 min): Abre Focus On o toma papel. Escribe absolutamente TODO lo que tienes en la cabeza sin filtrar ni organizar. Tareas, preocupaciones, ideas, pendientes, miedos, conversaciones pendientes. Todo. Sin juzgar si es importante o no.', 'RESPIRA (30 seg): Cierra los ojos. Tres respiraciones profundas y lentas. Siente que lo que escribiste ya no tienes que recordarlo —está guardado. Tu mente puede soltarlo.', 'FILTRA (90 seg): Mira lo que escribiste. Una sola pregunta por cada elemento: ¿puedo hacer algo al respecto HOY? Si sí, márcalo. Si no, déjalo. No elimines, solo distingue.', 'ELIGE UNO (30 seg): De lo que marcaste como accionable hoy, elige lo más importante. Solo uno. Ese es tu foco ahora. El resto sigue en la lista pero no dirige tu atención.'] },
      { type: 'quote', quote: 'Una mente llena no puede enfocarse.\nUna mente vaciada no puede resistirse.', author: 'Focus On' },
      { type: 'chapter', title: 'La ciencia detrás del vaciado', body: `Bluma Zeigarnik, psicóloga rusa, descubrió algo fascinante: los meseros de un restaurante recordaban perfectamente los pedidos pendientes pero los olvidaban casi inmediatamente después de entregarlos.\n\nSu cerebro mantenía activos los ciclos incompletos hasta que se cerraban.\n\nEste "efecto Zeigarnik" explica por qué las tareas pendientes siguen apareciendo en tu mente aunque intentes olvidarlas. Tu cerebro las mantiene en primer plano hasta que se completen o se deleguen a un sistema externo confiable.\n\nCuando escribes algo en Focus On, tu cerebro recibe la señal de que puede soltar esa información. Ya no tiene que mantenerla activa. El ciclo no está cerrado, pero está registrado.\n\nEl resultado inmediato es espacio mental. Y el espacio mental es donde ocurre la concentración real.` },
      { type: 'closing', title: 'Cuándo usarlo', action: 'Este ejercicio funciona mejor tres veces al día: al inicio de la mañana antes de revisar mensajes, después del almuerzo cuando la energía baja, y al final del día para cerrar ciclos mentales. Diez minutos total. La claridad que produce dura horas. Empieza ahora.' },
    ],
  },
  '6': {
    id: '6',
    title: 'Ritual de Enfoque Diario',
    category: 'Hábitos',
    readTime: '10 min',
    color: 'from-rose-500 via-pink-500 to-purple-500',
    subtitle: 'La rutina de 10 minutos que separa un día productivo de uno perdido',
    icon: '🎯',
    sections: [
      { type: 'cover', title: 'Ritual de\nEnfoque Diario', subtitle: 'La rutina de 10 minutos que separa un día productivo de uno perdido' },
      { type: 'chapter', title: 'Por qué los rituales funcionan diferente', body: `Una rutina es algo que haces. Un ritual es algo que te prepara.\n\nLa diferencia puede parecer semántica, pero no lo es. La neurociencia respalda una distinción real entre ambos.\n\nCuando repites una secuencia de acciones antes de una tarea importante, tu cerebro aprende a asociar esa secuencia con el estado mental requerido. Con suficiente repetición, el ritual activa automáticamente ese estado.\n\nLos atletas de élite lo saben intuitivamente. Rafael Nadal acomoda sus botellas de agua de la misma manera antes de cada punto. No es superstición —es un ancla neurológica que activa un estado mental específico.\n\nTú puedes tener tu propio ritual de enfoque. No necesita ser elaborado. Necesita ser consistente.\n\nEl ritual que vas a aprender aquí está diseñado para durar exactamente diez minutos y producir tres efectos: claridad sobre lo que importa, intención sobre cuándo lo harás, y activación del estado de ejecución.` },
      { type: 'exercise', title: 'El Ritual de 10 Minutos', steps: ['INTENCIÓN (2 min): Antes de tocar cualquier pantalla, hazte esta pregunta: ¿qué quiero haber completado al terminar este día? No una lista. Una intención. Una frase. Escríbela.', 'SILENCIO (2 min): Dos minutos sin pantallas, sin música, sin nada. Solo tú y el día que empieza. Puede sentirse incómodo. Esa incomodidad es la señal de que lo necesitas.', 'PRIORIDADES (3 min): Abre Focus On. Escribe o revisa tus tareas. Elige las tres más importantes para hoy. Solo tres. El resto existe pero no dirige tu día.', 'PRIMER BLOQUE (2 min): Decide ahora mismo cuándo vas a trabajar en la tarea más importante. No "esta mañana". Una hora concreta. Una duración concreta. Ese bloque es sagrado.', 'ACTIVACIÓN (1 min): Haz algo físico inmediatamente. Diez sentadillas, veinte saltos, una caminata de sesenta segundos. El movimiento físico activa el cerebro de una forma que ningún café logra de manera sostenida.'] },
      { type: 'quote', quote: 'El día no te pertenece por defecto.\nSe gana en los primeros diez minutos.', author: 'Focus On' },
      { type: 'chapter', title: 'El cierre del día', body: `El ritual de la mañana determina la calidad de tu día. El ritual del cierre determina la calidad de tu mañana.\n\nMuchas personas tienen rituales de inicio. Muy pocas tienen rituales de cierre. Y eso es un error costoso.\n\nEl ritual de cierre tiene tres partes y toma menos de quince minutos:\n\nRevisión: ¿qué completaste hoy? No lo que planificaste —lo que realmente hiciste. Anótalo.\n\nReflexión: ¿qué aprendiste? ¿qué harías diferente? Una observación honesta sobre cómo fue el día.\n\nPreparación: define las tres prioridades de mañana ahora. Cuando tienes claridad sobre el día presente, puedes ver mejor qué viene después. Mañana no tendrás que pensar —solo ejecutar.\n\nEl cierre también cierra los ciclos abiertos del día. Tu cerebro puede descansar porque sabe que hay un plan para lo pendiente.` },
      { type: 'chapter', title: 'Los 21 primeros días', body: `Un ritual necesita repetición para volverse automático. No porque seas lento aprendiendo —sino porque así funciona la neuroplasticidad.\n\nCada vez que repites una secuencia, las conexiones neuronales que la soportan se fortalecen. La primera vez cuesta esfuerzo consciente. La décima vez, menos. La vigésima, empieza a sentirse automático.\n\nNo busques la perfección desde el primer día. Si un día fallas, el ritual no está roto. Solo continúa al día siguiente. Un día perdido en un sistema de 21 días es irrelevante. Abandonar el sistema por un día perdido es el error.\n\nComprométete a los diez minutos. Todos los días. Durante 21 días.` },
      { type: 'closing', title: 'Empieza mañana en la noche', action: 'El mejor momento para instalar este ritual es esta noche. Antes de dormir, define tus tres prioridades de mañana y decide a qué hora harás la primera. Cuando despiertes, el ritual ya estará esperándote.' },
    ],
  },
  '7': {
    id: '7',
    title: 'Los Que Sí Terminan',
    category: 'Mentalidad',
    readTime: '14 min',
    color: 'from-yellow-400 via-amber-500 to-orange-600',
    subtitle: 'Qué tienen en común las personas que completan lo que empiezan',
    icon: '🏆',
    sections: [
      { type: 'cover', title: 'Los Que\nSí Terminan', subtitle: 'Qué tienen en común las personas que completan lo que empiezan' },
      { type: 'chapter', title: 'El problema no es empezar', body: `Empezar es fácil. Todos empezamos cosas.\n\nEmpezamos dietas, proyectos, hábitos, negocios, cursos. La energía del inicio es real y poderosa. La novedad motiva. La posibilidad emociona.\n\nEl problema es el día ocho. El día quince. El día donde ya no hay novedad, donde el progreso es invisible, donde la dificultad se volvió real y la motivación inicial se evaporó.\n\nAhí es donde se separan los que terminan de los que no.\n\nY la diferencia no es talento. No es suerte. Es un conjunto de comportamientos específicos y decisiones conscientes que puedes identificar, aprender y practicar.\n\nLas personas que completan las cosas no son diferentes a las que no las completan. Solo hacen ciertas cosas de manera diferente. Y esas cosas puedes aprenderlas.` },
      { type: 'chapter', title: 'Comportamiento 1: Hacen el trabajo feo primero', body: `Todo proyecto, sin excepción, tiene una parte emocionante y una parte aburrida.\n\nLa parte emocionante te hace empezar. La parte aburrida determina si terminas.\n\nLos que completan las cosas han aprendido esto: el trabajo feo no desaparece por evitarlo. Se acumula. Y entre más se acumula, más peso tiene sobre el proyecto entero.\n\nLo que hacen es identificar cuál es la parte menos atractiva —la tarea que nadie quiere hacer, el paso que requiere más concentración sin recompensa inmediata— y la programan primero.\n\nNo porque les guste. Sino porque saben que si la dejan para después, después nunca llega.\n\nUna pregunta para ti: en tu proyecto más importante ahora mismo, ¿cuál es la parte que has estado evitando? Esa es exactamente la que debes hacer primero mañana.` },
      { type: 'quote', quote: 'El éxito no está en la inspiración.\nEstá en las horas que nadie ve,\nhaciendo lo que nadie quiere hacer.', author: 'Focus On' },
      { type: 'chapter', title: 'Comportamiento 2: No dependen del estado de ánimo', body: `"Hoy no me siento bien."\n"No estoy inspirado."\n"Mañana lo hago con más energía."\n\n¿Te suena familiar? A todos nos suena.\n\nLa diferencia está en lo que hacen los que terminan después de decirse estas cosas: las hacen de todas formas.\n\nHan aprendido algo fundamental: el estado de ánimo es un mal jefe. Es inconsistente, caprichoso, fácilmente influenciado por el hambre, el sueño, las conversaciones del día, el clima.\n\nSi esperas sentirte bien para trabajar, trabajarás de manera esporádica. Y lo esporádico rara vez lleva a algún lugar.\n\nLos que completan las cosas han desconectado la producción del sentimiento. Producen en los días buenos y en los malos. No porque sean robots —sino porque saben que el movimiento genera momentum, y el momentum genera motivación, no al revés.` },
      { type: 'chapter', title: 'Comportamiento 3: Tienen sistemas, no solo metas', body: `"Voy a terminar este proyecto para fin de mes."\n\nEso es una meta. Una meta sin un sistema es un deseo con fecha de expiración.\n\nLos que terminan las cosas definen no solo qué van a lograr, sino exactamente cuándo y cómo van a trabajar en ello. No esperan tener tiempo —crean el tiempo con anticipación.\n\nLa diferencia práctica: quien tiene meta dice "voy a trabajar en el proyecto esta semana". Quien tiene sistema dice "los martes y jueves de 9 a 11am trabajo en el proyecto, y los viernes reviso el avance".\n\nEl sistema elimina la decisión diaria de cuándo y cómo. Y cada decisión que eliminamos conserva energía para lo que importa.` },
      { type: 'chapter', title: 'Comportamiento 4: Tienen identidad, no solo metas', body: `Aquí está la diferencia más profunda.\n\n"Quiero terminar este proyecto" es una meta. Las metas se pueden abandonar cuando la motivación desaparece.\n\n"Soy alguien que termina lo que empieza" es una identidad. La identidad es mucho más difícil de traicionar, porque traicionarla no es solo perder una oportunidad —es actuar en contra de quién eres.\n\nCada acción que tomas es un voto por el tipo de persona que quieres ser. Con suficientes votos, esa persona se convierte en la real.\n\nCuando completas la tarea aunque no tengas ganas, votas por ser alguien que termina las cosas. Cuando cumples el compromiso que te hiciste aunque nadie lo sepa, votas por ser alguien que se puede confiar en sí mismo.\n\nCon el tiempo, esos votos cambian la historia que te cuentas sobre quién eres.` },
      { type: 'list', title: 'Patrones que distinguen a los que terminan', items: ['Definen el siguiente paso concreto antes de cerrar cualquier sesión de trabajo', 'Celebran los avances pequeños, no solo los grandes logros', 'Tienen registro visible de lo que han completado', 'Cuando encuentran obstáculos, los nombran y buscan soluciones antes de pausar', 'Protegen activamente su tiempo de trabajo de las interrupciones', 'Revisan semanalmente si están avanzando hacia lo que importa'] },
      { type: 'quote', quote: 'Terminar es un hábito.\nComo todos los hábitos,\nse construye con repetición.', author: 'Focus On' },
      { type: 'closing', title: 'Tu declaración de identidad', action: 'Escribe esta frase donde la veas todos los días: "Soy alguien que termina lo que empieza." No como afirmación vacía. Como declaración de identidad. Cada vez que eliges trabajar cuando no tienes ganas, eres fiel a esa identidad. Empieza hoy con una cosa. Una sola cosa completada vale más que diez comenzadas.' },
    ],
  },
  '8': {
    id: '8',
    title: 'Control Total de tu Día',
    category: 'Hábitos',
    readTime: '8 min',
    color: 'from-violet-500 via-purple-500 to-indigo-600',
    subtitle: 'Toma el control antes de que el día te controle a ti',
    icon: '🎖️',
    sections: [
      { type: 'cover', title: 'Control Total\nde tu Día', subtitle: 'Toma el control antes de que el día te controle a ti' },
      { type: 'chapter', title: 'El día por defecto', body: `Sin intención, el día te arrastra.\n\nEmpieza con la revisión automática de notificaciones antes de levantarte. Continúa respondiendo mensajes que no son urgentes porque están ahí. Entra en reuniones que no necesitaban tu presencia. Se pierde en tareas de bajo impacto. Termina con la sensación de haber trabajado todo el día sin haber avanzado en lo que importa.\n\nEso no es falta de esfuerzo. Es falta de diseño.\n\nEl día por defecto siempre pertenece a las prioridades de otros. Las notificaciones son las prioridades de las apps. Los mensajes urgentes son las prioridades de quien los envía. Las reuniones son las prioridades de quien las convoca.\n\nEl día diseñado pertenece a las tuyas.` },
      { type: 'quote', quote: 'El que no diseña su día\ntrabaja en el diseño del día de otro.', author: 'Focus On' },
      { type: 'chapter', title: 'Los tres bloques que cambian todo', body: `No necesitas una agenda perfecta con cada hora planificada. Necesitas tres bloques protegidos:\n\nEl Bloque Profundo es donde ocurre tu trabajo más importante. Requiere concentración sostenida. Debe estar en tu momento de mayor energía. Debe tener al menos noventa minutos sin interrupciones. Y debe estar protegido activamente.\n\nEl Bloque Reactivo es donde manejas lo que el mundo te trae. Correos, mensajes, reuniones, tareas administrativas. Es importante pero no es donde avanzas en lo que más importa. Ponlo en tu momento de menor energía.\n\nEl Bloque de Cierre es donde preparas el día siguiente. Quince o treinta minutos. Revisas qué hiciste, actualizas tus tareas, defines las prioridades de mañana. Este bloque determina qué tan bien empieza tu día siguiente.\n\nTres bloques. Sin necesidad de planificar cada minuto. Resultado completamente diferente.` },
      { type: 'chapter', title: 'La trampa de la reactividad', body: `Existe un estado de trabajo que se parece a la productividad pero no lo es: la reactividad constante.\n\nCuando respondes cada mensaje en el momento en que llega, cuando estás siempre disponible para todos, cuando tu atención salta de urgencia en urgencia —te sientes ocupado. Incluso te sientes útil.\n\nPero hay una diferencia enorme entre estar ocupado y avanzar.\n\nEl trabajo que mueve realmente tu vida hacia adelante requiere bloques de concentración ininterrumpida. Y esos bloques no ocurren por accidente. Tienes que crearlos y defenderlos activamente.\n\nLa mayoría de las personas pasa la mayor parte del tiempo en trabajo superficial —correos, mensajes, reuniones, tareas menores— y confunde esa actividad con productividad.` },
      { type: 'list', title: 'Señales de que el día te controla a ti', items: ['Revisas el teléfono antes de decidir cuáles son tus prioridades del día', 'Respondes mensajes inmediatamente sin importar lo que estabas haciendo', 'Al final del día no puedes nombrar algo específico e importante que completaste', 'Sientes que trabajaste mucho pero avanzaste poco', 'Tus tareas más importantes siempre se posponen por urgencias', 'No tienes bloques de tiempo protegidos para trabajo profundo'] },
      { type: 'chapter', title: 'Recuperar el control en cinco pasos', body: `No tienes que rediseñar todo tu día de golpe.\n\nPrimer paso: define esta semana cuál es tu tarea más importante cada día, antes de revisar mensajes. Solo ese cambio transforma el tono del día.\n\nSegundo paso: identifica tu bloque de mayor energía y protege al menos una hora para trabajo profundo. Una hora. No tres. Una.\n\nTercer paso: agrupa la revisión de mensajes en dos momentos fijos del día en lugar de responder en tiempo real. El mundo no colapsa si tardas dos horas en responder.\n\nCuarto paso: al final de cada día, escribe tus tres prioridades de mañana. Cuando despiertes, ya sabrás qué hacer primero.\n\nQuinto paso: revisa semanalmente si estás avanzando en lo que verdaderamente importa, no solo en lo que está en tu lista.` },
      { type: 'quote', quote: 'Un día bien diseñado no es un día perfecto.\nEs un día donde lo que importa\ntuvo su lugar.', author: 'Focus On' },
      { type: 'closing', title: 'Diseña mañana ahora', action: 'Antes de cerrar Focus On hoy, define tus tres prioridades de mañana. Decide a qué hora vas a trabajar en la primera y por cuánto tiempo. Ese bloque es sagrado. El control del día empieza la noche anterior.' },
    ],
  },
};

interface CoachContentReaderProps {
  open: boolean;
  onClose: () => void;
  content: CoachContent | null;
}

export function CoachContentReader({ open, onClose, content }: CoachContentReaderProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setCurrentSection(0);
    }
  }, [open, content]);

  const goToSection = (index: number) => {
    if (isAnimating || !content) return;
    if (index < 0 || index >= content.sections.length) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSection(index);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setIsAnimating(false);
    }, 150);
  };

  if (!open || !content) return null;

  const section = content.sections[currentSection];
  const isFirst = currentSection === 0;
  const isLast = currentSection === content.sections.length - 1;
  const progress = content.sections.length > 1
    ? Math.round((currentSection / (content.sections.length - 1)) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-base">{content.icon}</span>
          <span className="font-medium">{content.category} · {content.readTime}</span>
        </div>
        <div className="text-xs font-semibold text-muted-foreground tabular-nums w-9 text-right">
          {progress}%
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted/30 relative overflow-hidden">
        <div
          className={cn("h-full bg-gradient-to-r transition-all duration-500 ease-out", content.color)}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain transition-opacity duration-150",
          isAnimating ? "opacity-0" : "opacity-100"
        )}
      >
        {section.type === 'cover' && (
          <div className="min-h-full flex flex-col">
            <div className={cn("relative flex-1 flex items-center justify-center px-6 py-16 bg-gradient-to-br", content.color)}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="relative z-10 text-center max-w-md mx-auto">
                <div className="text-6xl mb-6 drop-shadow-lg">{content.icon}</div>
                <h1
                  className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5 whitespace-pre-line"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {section.title}
                </h1>
                <p className="text-white/85 text-base sm:text-lg leading-relaxed mb-8">
                  {section.subtitle}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-medium">
                  <Star className="w-3.5 h-3.5 fill-white" />
                  {content.readTime} · {content.category}
                </div>
              </div>
            </div>
            <div className="px-6 py-6 text-center">
              <p className="text-xs text-muted-foreground italic">
                Desliza hacia adelante para comenzar la lectura.
              </p>
            </div>
          </div>
        )}

        {section.type === 'chapter' && (
          <article className="max-w-2xl mx-auto px-6 py-10">
            <div className="flex items-center gap-2 mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Capítulo</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-8 leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {section.title}
            </h2>
            <div className="space-y-5">
              {section.body?.split('\n\n').map((p, i) => (
                <p
                  key={i}
                  className="text-foreground/90 text-[17px] leading-[1.75]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {p}
                </p>
              ))}
            </div>
          </article>
        )}

        {section.type === 'quote' && (
          <div className={cn("min-h-full flex flex-col items-center justify-center px-8 py-16 bg-gradient-to-br", content.color)}>
            <Quote className="w-10 h-10 text-white/40 mb-6" />
            <blockquote
              className="text-2xl sm:text-3xl font-medium text-white text-center leading-relaxed max-w-xl whitespace-pre-line"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              "{section.quote}"
            </blockquote>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-px w-8 bg-white/40" />
              <p className="text-white/80 text-sm font-medium tracking-wide uppercase">
                {section.author}
              </p>
              <div className="h-px w-8 bg-white/40" />
            </div>
          </div>
        )}

        {section.type === 'exercise' && (
          <article className="max-w-2xl mx-auto px-6 py-10">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <Target className="w-3.5 h-3.5" />
              Ejercicio
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-8 leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {section.title}
            </h2>
            <ol className="space-y-5">
              {section.steps?.map((step, i) => {
                const colonIndex = step.indexOf(':');
                const label = colonIndex > -1 ? step.substring(0, colonIndex) : `Paso ${i + 1}`;
                const body = colonIndex > -1 ? step.substring(colonIndex + 1).trim() : step;
                return (
                  <li key={i} className="flex gap-4">
                    <div className={cn(
                      "shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br shadow-md",
                      content.color
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="font-bold text-foreground mb-1.5 text-sm uppercase tracking-wide">
                        {label}
                      </h3>
                      <p
                        className="text-foreground/85 leading-relaxed text-[16px]"
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        {body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        )}

        {section.type === 'list' && (
          <article className="max-w-2xl mx-auto px-6 py-10">
            <div className="flex items-center gap-2 mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="w-3.5 h-3.5" />
              <span>Lista</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-8 leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {section.title}
            </h2>
            <ul className="space-y-3">
              {section.items?.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-3 p-4 rounded-xl bg-muted/40 border border-border/50"
                >
                  <div className={cn(
                    "shrink-0 w-2 h-2 mt-2.5 rounded-full bg-gradient-to-br",
                    content.color
                  )} />
                  <p
                    className="text-foreground/90 leading-relaxed text-[16px]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        )}

        {section.type === 'closing' && (
          <article className="max-w-2xl mx-auto px-6 py-10">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Acción
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {section.title}
            </h2>
            <div className={cn(
              "p-6 rounded-2xl bg-gradient-to-br text-white shadow-lg",
              content.color
            )}>
              <Target className="w-6 h-6 mb-3 opacity-90" />
              <p
                className="text-[17px] leading-[1.7]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {section.action}
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <Trophy className="w-7 h-7 text-primary" />
              <p className="text-sm text-muted-foreground max-w-sm">
                Completaste <span className="font-semibold text-foreground">{content.title}</span>. Ahora ve a Focus On y pon en práctica lo que leíste.
              </p>
            </div>
          </article>
        )}
      </div>

      {/* Footer nav */}
      <footer className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border/50 backdrop-blur-sm">
        <button
          onClick={() => goToSection(currentSection - 1)}
          disabled={isFirst}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground disabled:opacity-25 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Atrás
        </button>

        <div className="flex items-center gap-1.5">
          {content.sections.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSection(i)}
              aria-label={`Ir a sección ${i + 1}`}
              className={cn(
                "rounded-full transition-all duration-300",
                i === currentSection
                  ? "w-5 h-1.5 bg-primary"
                  : "w-1.5 h-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        <button
          onClick={() => isLast ? onClose() : goToSection(currentSection + 1)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
            isLast
              ? `bg-gradient-to-r ${content.color} text-white shadow-md`
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          {isLast ? 'Completar' : 'Siguiente'}
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </button>
      </footer>
    </div>
  );
}
