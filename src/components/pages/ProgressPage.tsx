import { Flame, Clock, Target } from 'lucide-react';
import { FocusSession, Task } from '@/types/focuson';
import { WeeklySummary } from '@/components/WeeklySummary';

interface ProgressPageProps {
  sessions: FocusSession[];
  tasks: Task[];
  streak: number;
}

export function ProgressPage({ sessions, tasks, streak }: ProgressPageProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const todaySessions = sessions.filter(s => s.date === today);
  const todayCompletedSessions = todaySessions.filter(s => s.status === 'completed');
  const todayMinutes = Math.round(todaySessions.reduce((acc, s) => acc + s.focusedDuration, 0) / 60);

  // Get last 7 days for history
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyStats = last7Days.map(date => {
    const daySessions = sessions.filter(s => s.date === date);
    return {
      date,
      sessionsCompleted: daySessions.filter(s => s.status === 'completed').length,
      minutesFocused: Math.round(daySessions.reduce((acc, s) => acc + s.focusedDuration, 0) / 60),
    };
  });

  const maxMinutes = Math.max(...dailyStats.map(d => d.minutesFocused), 1);

  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return days[date.getDay()];
  };

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <h1 className="text-2xl font-display font-semibold text-foreground mb-2 animate-fade-in">
        Progreso
      </h1>
      <p className="text-muted-foreground mb-8 animate-fade-in">
        Sin presión. Solo observa.
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Sessions today */}
        <div className="focus-card animate-slide-up">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Target size={18} />
            <span className="text-sm">Sesiones hoy</span>
          </div>
          <p className="text-3xl font-display font-semibold text-foreground">
            {todayCompletedSessions.length}
          </p>
        </div>

        {/* Minutes today */}
        <div className="focus-card animate-slide-up stagger-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock size={18} />
            <span className="text-sm">Minutos hoy</span>
          </div>
          <p className="text-3xl font-display font-semibold text-foreground">
            {todayMinutes}
          </p>
        </div>

        {/* Streak */}
        <div className="focus-card col-span-2 animate-slide-up stagger-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Flame size={18} className="text-orange-500" />
                <span className="text-sm">Días que empezaste</span>
              </div>
              <p className="text-4xl font-display font-semibold text-foreground">
                {streak} <span className="text-lg font-normal text-muted-foreground">días</span>
              </p>
            </div>
            {streak > 0 && (
              <div className="streak-badge animate-pulse-soft">
                <Flame size={16} className="text-orange-500" />
                Sigue así
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="focus-card animate-slide-up stagger-3 mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Últimos 7 días</h3>

        <div className="flex items-end justify-between gap-2 h-24">
          {dailyStats.map((stat, index) => (
            <div key={stat.date} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center">
                {stat.minutesFocused > 0 && (
                  <span className="text-xs text-muted-foreground mb-1">
                    {stat.minutesFocused}m
                  </span>
                )}
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${Math.max((stat.minutesFocused / maxMinutes) * 60, stat.minutesFocused > 0 ? 8 : 4)}px`,
                    backgroundColor: stat.minutesFocused > 0 
                      ? `hsl(152, 55%, ${45 + (index * 2)}%)` 
                      : 'hsl(var(--muted))',
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground mt-2">
                {formatDay(stat.date)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Summary (Cierre semanal) */}
      <WeeklySummary tasks={tasks} sessions={sessions} />

      {/* Recent sessions */}
      {todaySessions.length > 0 && (
        <div className="mt-8 animate-slide-up stagger-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Sesiones de hoy
          </h3>
          <div className="space-y-2">
            {todaySessions.slice().reverse().map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm text-foreground truncate flex-1 mr-4">
                  {session.task}
                </span>
                <span className="text-sm text-muted-foreground flex-shrink-0">
                    {Math.round(session.focusedDuration / 60)} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && tasks.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <p className="text-muted-foreground">
            Aún no tienes actividad.<br />
            Crea tu primera tarea para empezar.
          </p>
        </div>
      )}
    </div>
  );
}
