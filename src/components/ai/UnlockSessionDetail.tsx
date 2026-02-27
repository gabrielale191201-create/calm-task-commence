import { X } from 'lucide-react';
import { UnlockSession } from '@/types/unlockSession';

interface UnlockSessionDetailProps {
  session: UnlockSession;
  onClose: () => void;
}

export function UnlockSessionDetail({ session, onClose }: UnlockSessionDetailProps) {
  const date = new Date(session.createdAt);
  const dateLabel = date.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

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
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Claridad Mental</h4>
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-4 py-3">{session.claridad}</p>
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Foco Único</h4>
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-4 py-3">{session.foco}</p>
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Ritual de Inicio</h4>
        <div className="bg-muted/50 rounded-xl px-4 py-3 space-y-1.5">
          {session.ritual.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-medium text-primary mt-0.5">{i + 1}.</span>
              <p className="text-sm text-foreground">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Micro-compromiso</h4>
        <p className="text-sm text-foreground font-medium italic bg-accent/50 rounded-xl px-4 py-3">{session.compromiso}</p>
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Acción sugerida</h4>
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-4 py-3">{session.accion}</p>
      </section>

      {/* Execution indicators */}
      <div className="flex gap-3 pt-2">
        {session.startedFocusTime && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">Focus Time iniciado</span>
        )}
        {session.convertedToTask && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">Convertida en tarea</span>
        )}
        {session.completed && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 font-medium">Completado</span>
        )}
        {!session.startedFocusTime && !session.convertedToTask && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium">Sin acción</span>
        )}
      </div>
    </div>
  );
}
