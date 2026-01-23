import { X, ArrowRight, Lightbulb, Clock, Target, RotateCcw, BarChart3, Heart } from 'lucide-react';

interface HowToUsePageProps {
  onClose: () => void;
}

const steps = [
  {
    icon: ArrowRight,
    title: 'No planifiques, empieza',
    description: 'La planificación excesiva es procrastinación disfrazada. Solo elige una cosa y comienza.',
  },
  {
    icon: Lightbulb,
    title: 'Escribe solo lo que harás ahora',
    description: 'No "estudiar para el examen". Mejor: "Abrir el libro en la página 23".',
  },
  {
    icon: Clock,
    title: 'Elige pocos minutos',
    description: '2 minutos es mejor que ninguno. Empezar es lo difícil, no continuar.',
  },
  {
    icon: Target,
    title: 'Confía en el enfoque',
    description: 'Una vez que empiezas, el resto fluye. El temporizador es solo un recordatorio amable.',
  },
  {
    icon: RotateCcw,
    title: 'Usa rutinas pequeñas',
    description: 'Las rutinas eliminan la fricción. Pequeños hábitos diarios construyen grandes cambios.',
  },
  {
    icon: BarChart3,
    title: 'Revisa tu progreso sin exigirte',
    description: 'El progreso no es perfección. Celebra cada sesión completada.',
  },
];

export function HowToUsePage({ onClose }: HowToUsePageProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="min-h-full px-6 py-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Cómo usar FocusON
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X size={24} className="text-muted-foreground" />
          </button>
        </div>

        {/* Intro */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Heart size={32} className="text-primary" />
          </div>
          <p className="text-lg text-foreground">
            FocusON está diseñado para ser<br />
            <span className="font-semibold text-primary">simple, calmado y sin juicios.</span>
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="focus-card animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground mb-1">
                    {index + 1}. {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer message */}
        <div className="text-center mt-10 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <p className="text-muted-foreground">
            Recuerda: <span className="text-foreground font-medium">solo empezar.</span><br />
            Nada más.
          </p>
        </div>

        {/* Close button */}
        <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <button
            onClick={onClose}
            className="btn-primary-focus w-full"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
