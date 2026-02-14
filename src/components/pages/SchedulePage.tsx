import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Task, QuickNote } from '@/types/focuson';
import { cn } from '@/lib/utils';
import { toISODate, startOfWeekMonday, parseTimeToMinutes, formatWeekRangeEs, parseDateString } from '@/lib/dateUtils';
import { TimeBlock } from '@/components/schedule/TimeBlock';
import { StartFocusDialog } from '@/components/StartFocusDialog';
import { DailyAgendita } from '@/components/schedule/DailyAgendita';

type View = 'hoy' | 'semana';

// Extended range: 05:00 - 23:00
const HOURS = Array.from({ length: 19 }, (_, i) => i + 5);
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export interface SchedulePageProps {
  tasks: Task[];
  quickNotes: QuickNote[];
  onStartFocus: (taskText: string, minutes: number) => void;
  tasksCountByDate: Map<string, number>;
  onAddQuickNote: (text: string, date: string) => void;
  onToggleQuickNote: (id: string) => void;
  onDeleteQuickNote: (id: string) => void;
}

export function SchedulePage({ tasks, quickNotes, onStartFocus, tasksCountByDate, onAddQuickNote, onToggleQuickNote, onDeleteQuickNote }: SchedulePageProps) {
  const [view, setView] = useState<View>('semana');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const todayISO = toISODate(new Date());

  // All tasks now MUST have date + time + duration (they create blocks)
  const scheduledTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.scheduledDate && t.scheduledTime && t.durationMinutes && t.status === 'pending'
    );
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.scheduledDate && t.scheduledTime && t.durationMinutes && t.status === 'completed'
    );
  }, [tasks]);

  const allVisibleTasks = useMemo(() => [...scheduledTasks, ...completedTasks], [scheduledTasks, completedTasks]);

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

  // Build grid: day -> hour -> task (includes both pending and done)
  const grid = useMemo(() => {
    const map = new Map<string, Map<number, Task>>();
    for (const day of weekDays) {
      map.set(day, new Map());
    }
    for (const task of allVisibleTasks) {
      if (!weekDays.includes(task.scheduledDate)) continue;
      const startMinutes = parseTimeToMinutes(task.scheduledTime);
      const startHour = Math.floor(startMinutes / 60);
      if (startHour >= 5 && startHour <= 22) {
        map.get(task.scheduledDate)!.set(startHour, task);
      }
    }
    return map;
  }, [weekDays, allVisibleTasks]);

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
      {/* Header with visual emphasis */}
      <div className="mb-4 animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-1">Horario</h1>
        <p className="text-muted-foreground text-sm">Tu estructura del día. Como un horario escolar.</p>
      </div>

      {/* Central info - visual prominence */}
      <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 animate-slide-up">
        <p className="text-sm text-foreground text-center font-medium">
          Los bloques se generan automáticamente al crear una tarea.
        </p>
        <p className="text-xs text-muted-foreground text-center mt-1">
          Rango visible: 05:00 – 23:00
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

          {/* Agendita diaria para hoy */}
          <div className="mt-6">
            <DailyAgendita
              notes={quickNotes}
              date={todayISO}
              onAddNote={onAddQuickNote}
              onToggleNote={onToggleQuickNote}
              onDeleteNote={onDeleteQuickNote}
            />
          </div>
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
                  const d = parseDateString(day);
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
