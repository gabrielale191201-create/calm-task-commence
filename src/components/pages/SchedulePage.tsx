import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Task } from '@/types/focuson';
import { cn } from '@/lib/utils';
import { toISODate, startOfWeekMonday, parseTimeToMinutes, formatWeekRangeEs } from '@/lib/dateUtils';
import { TimeBlock } from '@/components/schedule/TimeBlock';
import { StartFocusDialog } from '@/components/StartFocusDialog';

type View = 'hoy' | 'semana';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export interface SchedulePageProps {
  tasks: Task[];
  onStartFocus: (taskText: string, minutes: number) => void;
  tasksCountByDate: Map<string, number>;
}

export function SchedulePage({ tasks, onStartFocus, tasksCountByDate }: SchedulePageProps) {
  const [view, setView] = useState<View>('semana');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const todayISO = toISODate(new Date());

  // Only scheduled tasks with date + time + duration
  const scheduledTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.scheduledDate && t.scheduledTime && t.durationMinutes
    );
  }, [tasks]);

  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return toISODate(d);
    });
  }, [weekStart]);

  // Today's tasks for the "hoy" view
  const todayTasks = useMemo(() => {
    return scheduledTasks
      .filter((t) => t.scheduledDate === todayISO)
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  }, [scheduledTasks, todayISO]);

  // Build grid: day -> hour -> task
  const grid = useMemo(() => {
    const map = new Map<string, Map<number, Task>>();
    for (const day of weekDays) {
      map.set(day, new Map());
    }
    for (const task of scheduledTasks) {
      if (!weekDays.includes(task.scheduledDate!)) continue;
      const startMinutes = parseTimeToMinutes(task.scheduledTime!);
      const startHour = Math.floor(startMinutes / 60);
      if (startHour >= 7 && startHour <= 20) {
        map.get(task.scheduledDate!)!.set(startHour, task);
      }
    }
    return map;
  }, [weekDays, scheduledTasks]);

  const getRowSpan = (task: Task) => {
    const hours = Math.ceil((task.durationMinutes || 60) / 60);
    return Math.min(hours, 4);
  };

  const occupiedCells = useMemo(() => {
    const occupied = new Set<string>();
    for (const [day, hourMap] of grid.entries()) {
      for (const [hour, task] of hourMap.entries()) {
        const span = getRowSpan(task);
        for (let i = 0; i < span; i++) {
          occupied.add(`${day}-${hour + i}`);
        }
      }
    }
    return occupied;
  }, [grid]);

  const handleTaskClick = (task: Task) => {
    if (task.status === 'pending') {
      setSelectedTask(task);
    }
  };

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <div className="flex items-center justify-between mb-3 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Horario</h1>
          <p className="text-muted-foreground text-sm">Tu estructura de bloques. Como un horario escolar.</p>
        </div>
      </div>

      {/* Info badge */}
      <div className="mb-5 p-2.5 rounded-xl bg-muted/40 border border-border/50 animate-slide-up">
        <p className="text-xs text-muted-foreground">
          Los bloques se generan automáticamente desde <span className="font-medium text-foreground">Tareas</span>.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6 animate-slide-up">
        <button
          onClick={() => setView('hoy')}
          className={cn('px-4 py-2 rounded-xl text-sm transition-colors', view === 'hoy' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground')}
        >
          Hoy
        </button>
        <button
          onClick={() => setView('semana')}
          className={cn('px-4 py-2 rounded-xl text-sm transition-colors', view === 'semana' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground')}
        >
          Semana
        </button>
      </div>

      {view === 'hoy' ? (
        <section className="animate-slide-up stagger-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <CalendarDays size={18} />
            <span className="text-sm font-medium capitalize">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <span className="ml-auto text-xs bg-muted px-2 py-1 rounded-full">
              {todayTasks.length}/5 bloques
            </span>
          </div>

          <div className="focus-card">
            <div className="space-y-3">
              {HOURS.map((hour) => {
                const hourTasks = todayTasks.filter((t) => {
                  const h = Math.floor(parseTimeToMinutes(t.scheduledTime!) / 60);
                  return h === hour;
                });

                return (
                  <div key={hour} className="flex gap-4">
                    <div className="w-12 text-right flex-shrink-0">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    </div>
                    <div className="flex-1">
                      {hourTasks.length === 0 ? (
                        <div className="h-10 rounded-lg bg-muted/20" />
                      ) : (
                        <div className="space-y-2">
                          {hourTasks.map((task) => (
                            <TimeBlock
                              key={task.id}
                              task={task}
                              rowSpan={1}
                              onClick={() => handleTaskClick(task)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {todayTasks.length === 0 && (
            <div className="text-center py-10 animate-fade-in">
              <p className="text-muted-foreground">
                Hoy no tienes bloques programados.<br />
                Ve a Tareas para crear uno.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="animate-slide-up stagger-1">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <span>Semana: <span className="font-medium text-foreground">{formatWeekRangeEs(new Date())}</span></span>
          </div>

          {/* School schedule grid */}
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="min-w-[640px]">
              {/* Header */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="text-xs text-muted-foreground text-center py-2">Hora</div>
                {weekDays.map((day, i) => {
                  const isToday = day === todayISO;
                  const d = new Date(day);
                  const count = tasksCountByDate.get(day) || 0;
                  return (
                    <div
                      key={day}
                      className={cn('text-center py-2 rounded-lg', isToday && 'bg-primary/10')}
                    >
                      <p className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>
                        {DAY_LABELS[i]}
                      </p>
                      <p className={cn('text-sm font-semibold', isToday ? 'text-primary' : 'text-foreground')}>
                        {d.getDate()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{count}/5</p>
                    </div>
                  );
                })}
              </div>

              {/* Grid body */}
              <div className="border border-border/50 rounded-2xl overflow-hidden bg-card">
                {HOURS.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 gap-px bg-border/30">
                    <div className="bg-card px-2 py-3 text-right">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    </div>

                    {weekDays.map((day) => {
                      const cellKey = `${day}-${hour}`;
                      const task = grid.get(day)?.get(hour);
                      const isOccupiedBySpan = occupiedCells.has(cellKey) && !task;
                      const isToday = day === todayISO;

                      if (isOccupiedBySpan) {
                        return <div key={cellKey} className="bg-transparent" />;
                      }

                      return (
                        <div
                          key={cellKey}
                          className={cn('bg-card min-h-[3rem] p-0.5', isToday && 'bg-primary/5')}
                        >
                          {task ? (
                            <TimeBlock
                              task={task}
                              rowSpan={getRowSpan(task)}
                              onClick={() => handleTaskClick(task)}
                            />
                          ) : (
                            <div className="w-full h-full rounded bg-muted/15" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {scheduledTasks.length === 0 && (
            <div className="text-center py-10 animate-fade-in mt-4">
              <p className="text-muted-foreground">
                No hay bloques esta semana.<br />
                Crea una tarea con fecha, hora y duración.
              </p>
            </div>
          )}
        </section>
      )}

      <StartFocusDialog
        open={!!selectedTask}
        onOpenChange={(o) => !o && setSelectedTask(null)}
        title={selectedTask?.text || ''}
        suggestedMinutes={selectedTask?.durationMinutes ?? 25}
        onStart={(mins) => {
          if (!selectedTask) return;
          onStartFocus(selectedTask.text, mins);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
