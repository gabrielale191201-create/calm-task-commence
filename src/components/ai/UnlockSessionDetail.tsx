import { X, ListPlus } from 'lucide-react';
import { UnlockSession, PrioritizedActivity } from '@/types/unlockSession';
import { cn } from '@/lib/utils';

interface UnlockSessionDetailProps {
  session: UnlockSession;
  onClose: () => void;
  onCreateTask?: (text: string) => void;
  onUpdateSession?: (id: string, updates: Partial<UnlockSession>) => void;
}

const LEVEL_LABELS: Record<PrioritizedActivity['level'], string> = {
  esencial: 'Esencial inmediato',
  importante: 'Importante próximo',
  secundario: 'Secundario',
};

const LEVEL_COLORS: Record<PrioritizedActivity['level'], string> = {
  esencial: 'bg-primary/10 text-primary border-primary/20',
  importante: 'bg-accent/50 text-accent-foreground border-accent/30',
  secundario: 'bg-muted/50 text-muted-foreground border-border/50',
};

export function UnlockSessionDetail({ session, onClose, onCreateTask, onUpdateSession }: UnlockSessionDetailProps) {
  const date = new Date(session.createdAt);
  const dateLabel = date.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const handleConvertToTask = (index: number, text: string) => {
    onCreateTask?.(text);
    if (onUpdateSession) {
      const updatedActividades = session.actividades.map((a, i) =>
        i === index ? { ...a, convertedToTask: true } : a
      );
      onUpdateSession(session.id, { actividades: updatedActividades });
    }
  };

  const renderActivitiesByLevel = (level: PrioritizedActivity['level']) => {
    const items = session.actividades
      .map((a, i) => ({ ...a, originalIndex: i }))
      .filter(a => a.level === level);
    if (items.length === 0) return null;

    return (
      <div key={level} className="space-y-1.5">
        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border inline-block", LEVEL_COLORS[level])}>
          {LEVEL_LABELS[level]}
        </span>
        <div className="space-y-1">
          {items.map((activity) => (
            <div key={activity.originalIndex} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <p className="text-sm text-foreground flex-1">{activity.text}</p>
              {activity.convertedToTask ? (
                <span className="text-[10px] text-primary font-medium shrink-0">✓ Tarea</span>
              ) : (
                <button
                  onClick={() => handleConvertToTask(activity.originalIndex, activity.text)}
                  className="shrink-0 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <ListPlus size={14} />
                  Tarea
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground capitalize">{dateLabel}</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* What the user wrote */}
      <section className="space-y-1.5">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lo que escribiste</h4>
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-4 py-3 leading-relaxed">{session.inputText}</p>
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Visión Interior</h4>
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-4 py-3 italic leading-relaxed">{session.visionInterior}</p>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Orden Consciente</h4>
        <div className="space-y-3">
          {renderActivitiesByLevel('esencial')}
          {renderActivitiesByLevel('importante')}
          {renderActivitiesByLevel('secundario')}
        </div>
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Consejo de Disciplina Interior</h4>
        <p className="text-sm text-foreground font-medium bg-accent/50 rounded-xl px-4 py-3 leading-relaxed">{session.consejoDisciplina}</p>
      </section>

      {/* Execution indicators */}
      <div className="flex gap-3 pt-2">
        {session.startedFocusTime && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">Focus Time iniciado</span>
        )}
        {session.completed && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 font-medium">Completado</span>
        )}
        {session.actividades.some(a => a.convertedToTask) && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
            {session.actividades.filter(a => a.convertedToTask).length} tarea{session.actividades.filter(a => a.convertedToTask).length > 1 ? 's' : ''} creada{session.actividades.filter(a => a.convertedToTask).length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
