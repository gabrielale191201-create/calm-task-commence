import { useState } from 'react';
import { History, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';
import { UnlockSession } from '@/types/unlockSession';
import { UnlockSessionDetail } from './UnlockSessionDetail';

interface UnlockHistoryProps {
  sessions: UnlockSession[];
  todayCount: number;
  weekCount: number;
}

export function UnlockHistory({ sessions, todayCount, weekCount }: UnlockHistoryProps) {
  const [selectedSession, setSelectedSession] = useState<UnlockSession | null>(null);

  if (selectedSession) {
    return <UnlockSessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />;
  }

  const sorted = [...sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Counters */}
      <div className="flex gap-3">
        <div className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-display font-semibold text-foreground">{todayCount}</p>
          <p className="text-xs text-muted-foreground">Hoy</p>
        </div>
        <div className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-display font-semibold text-foreground">{weekCount}</p>
          <p className="text-xs text-muted-foreground">Esta semana</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <History size={32} className="mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aún no tienes desbloqueos registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((session) => {
            const date = new Date(session.createdAt);
            const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            const timeLabel = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const hasAction = session.startedFocusTime || session.convertedToTask;

            return (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="w-full text-left px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors flex items-center gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  session.completed ? 'bg-green-500/10' : hasAction ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {session.completed ? (
                    <CheckCircle2 size={16} className="text-green-600" />
                  ) : (
                    <Zap size={14} className={hasAction ? 'text-primary' : 'text-muted-foreground'} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{session.accion}</p>
                  <p className="text-xs text-muted-foreground">{dateLabel} · {timeLabel}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
