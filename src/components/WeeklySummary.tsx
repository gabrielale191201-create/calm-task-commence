import { useMemo } from 'react';
import { Task, FocusSession } from '@/types/focuson';
import { startOfWeekMonday, endOfWeekSunday, toISODate, formatWeekRangeEs } from '@/lib/dateUtils';

interface WeeklySummaryProps {
  tasks: Task[];
  sessions: FocusSession[];
}

export function WeeklySummary({ tasks, sessions }: WeeklySummaryProps) {
  const weekStart = startOfWeekMonday(new Date());
  const weekEnd = endOfWeekSunday(new Date());
  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(weekEnd);

  const stats = useMemo(() => {
    // Filter tasks scheduled this week
    const weekTasks = tasks.filter((t) => {
      if (!t.scheduledDate) return false;
      return t.scheduledDate >= weekStartISO && t.scheduledDate <= weekEndISO;
    });

    const scheduled = weekTasks.length;
    const completed = weekTasks.filter((t) => t.status === 'done').length;
    const pending = weekTasks.filter((t) => t.status === 'pending').length;

    // Sessions this week
    const weekSessions = sessions.filter(
      (s) => s.date >= weekStartISO && s.date <= weekEndISO
    );
    const sessionsCompleted = weekSessions.filter((s) => s.status === 'completed').length;
    const sessionsAbandoned = weekSessions.filter((s) => s.status === 'abandoned').length;

    // Find longest duration tasks (potential difficulty)
    const longTasks = weekTasks
      .filter((t) => t.durationMinutes && t.durationMinutes >= 60)
      .length;

    return {
      scheduled,
      completed,
      pending,
      sessionsCompleted,
      sessionsAbandoned,
      longTasks,
    };
  }, [tasks, sessions, weekStartISO, weekEndISO]);

  // No data yet
  if (stats.scheduled === 0 && stats.sessionsCompleted === 0) {
    return (
      <div className="focus-card animate-slide-up">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Cierre semanal</h3>
        <p className="text-sm text-muted-foreground">
          Aún no tienes bloques esta semana.<br />
          Programa tu primera tarea para empezar.
        </p>
      </div>
    );
  }

  // Build observation text
  let observation = '';
  if (stats.longTasks > 0) {
    observation = 'Los bloques largos suelen ser los más difíciles. Considera dividirlos en pasos más pequeños.';
  } else if (stats.pending > stats.completed) {
    observation = 'Tienes bloques pendientes. Recuerda: un día cuenta con solo empezar uno.';
  } else if (stats.completed > 0) {
    observation = 'Vas bien. Mantén el ritmo sin forzar.';
  }

  return (
    <div className="focus-card animate-slide-up">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Cierre semanal</h3>
        <span className="text-xs text-muted-foreground">{formatWeekRangeEs(new Date())}</span>
      </div>

      <div className="space-y-3">
        <p className="text-foreground leading-relaxed">
          Programaste <span className="font-semibold">{stats.scheduled} bloques</span> esta semana.
        </p>
        
        {stats.completed > 0 && (
          <p className="text-foreground leading-relaxed">
            Completaste <span className="font-semibold text-primary">{stats.completed}</span>.
          </p>
        )}

        {stats.pending > 0 && (
          <p className="text-muted-foreground text-sm">
            Pendientes: {stats.pending}
          </p>
        )}

        {observation && (
          <p className="text-sm text-muted-foreground italic pt-2 border-t border-border/50">
            {observation}
          </p>
        )}
      </div>
    </div>
  );
}
