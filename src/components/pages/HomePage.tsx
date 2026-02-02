import { ArrowRight } from 'lucide-react';
import { Task, UserProfile } from '@/types/focuson';
import { OrganizationAssistant } from '@/components/ai/OrganizationAssistant';

interface HomePageProps {
  profile: UserProfile;
  topThreeTasks: Task[];
  onGoToFocus: () => void;
  onToggleTask: (id: string) => void;
  onAddTask: (text: string) => void;
  onRemoveFromTopThree: (id: string) => void;
  onRequestSchedule: () => void;
  startedStreak: number;
  hasVictoryToday: boolean;
  onStartFocusFromTopTask: (taskText: string, minutes: number) => void;
  onSendToTasks: (tasks: string[]) => void;
}

export function HomePage({
  profile,
  onGoToFocus,
  startedStreak,
  hasVictoryToday,
  onSendToTasks,
}: HomePageProps) {
  const today = new Date();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  const dateString = `${dayNames[today.getDay()]}, ${today.getDate()} de ${monthNames[today.getMonth()]}`;
  return (
    <div className="page-enter px-6 pt-8 pb-32">
      {/* Greeting */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-display font-semibold text-foreground mb-1">
          {greeting}, {profile.name || 'amigo'}
        </h1>
        <p className="text-muted-foreground">{dateString}</p>
      </div>

      {/* Streak info */}
      <div className="flex items-center justify-between mb-6 animate-slide-up">
        <div className="text-sm">
          <span className="text-muted-foreground">Días que empezaste: </span>
          <span className="font-medium text-foreground">{startedStreak}</span>
        </div>
        {hasVictoryToday && (
          <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full">
            ✓ Ya empezaste hoy
          </span>
        )}
      </div>

      {/* Main motivation */}
      <div className="text-center py-8 mb-6 animate-slide-up">
        <p className="text-2xl font-display font-semibold text-foreground leading-relaxed mb-2">
          Escribe lo que tienes en la cabeza.
        </p>
        <p className="text-muted-foreground text-sm">
          Focus On lo convierte en tareas claras para que empieces.
        </p>
      </div>

      {/* AI Organization Assistant */}
      <OrganizationAssistant
        onSendToTasks={onSendToTasks}
      />

      {/* Quick access button */}
      <div className="mt-8 animate-slide-up stagger-2">
        <button
          onClick={onGoToFocus}
          className="btn-secondary-focus w-full flex items-center justify-center gap-3"
        >
          Ir a Focus Time
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
