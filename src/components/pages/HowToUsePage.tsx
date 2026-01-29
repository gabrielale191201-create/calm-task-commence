import { X, Sparkles, CheckSquare, Play, Calendar, MessageCircle, Cloud } from 'lucide-react';

interface HowToUsePageProps {
  onClose: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: 'Escribes lo que tienes en la cabeza',
    description: 'En el Home, escribe todo lo que te preocupa o tienes pendiente. La IA lo convierte en tareas claras.',
  },
  {
    icon: CheckSquare,
    title: 'Tú decides en TAREAS',
    description: 'Las tareas llegan como borradores. Tú eliges la hora, duración y fecha de cada una.',
  },
  {
    icon: Calendar,
    title: 'El HORARIO se arma solo',
    description: 'Cuando confirmas hora y duración, el horario se construye automáticamente.',
  },
  {
    icon: Play,
    title: 'Focus Time acompaña',
    description: 'Inicia Focus Time desde una tarea. Un bloque. Una cosa a la vez.',
  },
  {
    icon: MessageCircle,
    title: 'El chat es para ti',
    description: 'La nubecita de chat sirve para escribir lo que sientes. Sin presión, sin tareas.',
  },
  {
    icon: Cloud,
    title: 'Notas rápidas',
    description: 'La burbuja de notas guarda lo que necesites anotar sin crear tareas ni bloques.',
  },
];

export function HowToUsePage({ onClose }: HowToUsePageProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="min-h-full px-6 py-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <h1 className="text-2xl font-display font-semibold text-foreground">
            ¿Cómo funciona Focus On?
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X size={24} className="text-muted-foreground" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-10">
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

        {/* Main rule */}
        <div className="text-center p-6 rounded-2xl bg-primary/5 border border-primary/20 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <p className="text-sm font-medium text-primary mb-2">Regla principal:</p>
          <p className="text-lg font-display font-semibold text-foreground">
            No planifiques de más.
            <br />
            <span className="text-primary">Empieza.</span>
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
