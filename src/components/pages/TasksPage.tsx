import { useMemo, useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Task } from '@/types/focuson';
import { TaskItem } from '@/components/TaskItem';
import { StartFocusDialog } from '@/components/StartFocusDialog';
import { toISODate } from '@/lib/dateUtils';

interface TasksPageProps {
  tasks: Task[];
  onAddTask: (input: { text: string; scheduledDate?: string; scheduledTime?: string; durationMinutes?: number }) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onStartFocus: (taskText: string, minutes: number) => void;
  getTasksCountForDate: (date: string) => number;
}

const MAX_TASKS_PER_DAY = 5;

export function TasksPage({ tasks, onAddTask, onToggleTask, onDeleteTask, onStartFocus, getTasksCountForDate }: TasksPageProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  const todayISO = toISODate(new Date());

  // Check limit for selected date
  const selectedDateCount = date ? getTasksCountForDate(date) : 0;
  const isAtLimit = date ? selectedDateCount >= MAX_TASKS_PER_DAY : false;

  const errors = useMemo(() => {
    if (!touched) return {} as Record<string, string>;
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Escribe un título.';
    if (time && !date) e.time = 'Elige fecha si defines hora.';
    if (duration && !date) e.duration = 'Elige fecha si defines duración.';
    const d = duration.trim();
    if (d) {
      const n = parseInt(d, 10);
      if (!Number.isFinite(n) || n <= 0 || n > 180) e.duration = 'Duración: 1–180 min.';
    }
    return e;
  }, [touched, title, time, date, duration]);

  const canSubmit = !!title.trim() && !errors.title && !errors.time && !errors.duration && !isAtLimit;

  const handleAddTask = () => {
    setTouched(true);
    setLimitError(null);

    if (isAtLimit) {
      setLimitError('Ya tienes suficiente por hoy.\nEste sistema funciona con límites.');
      return;
    }

    if (!canSubmit) return;

    const durationMinutes = duration.trim() ? Math.max(1, Math.min(180, parseInt(duration.trim(), 10))) : undefined;
    onAddTask({
      text: title.trim(),
      scheduledDate: date || undefined,
      scheduledTime: time || undefined,
      durationMinutes,
    });
    setTitle('');
    setDate('');
    setTime('');
    setDuration('');
    setTouched(false);
  };

  const pending = tasks.filter((t) => t.status === 'pending');
  const done = tasks.filter((t) => t.status === 'done');

  const formatChip = (t: Task) => {
    if (!t.scheduledDate) return '';
    const d = new Date(t.scheduledDate);
    const day = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const num = d.toLocaleDateString('es-ES', { day: '2-digit' });
    const mon = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    const timePart = t.scheduledTime ? ` · ${t.scheduledTime}` : '';
    const durPart = t.durationMinutes ? ` · ${t.durationMinutes}m` : '';
    return `${day} ${num} ${mon}${timePart}${durPart}`;
  };

  const todayTasks = useMemo(() => {
    return pending
      .filter((t) => t.scheduledDate === todayISO)
      .sort((a, b) => (a.scheduledTime || '99:99').localeCompare(b.scheduledTime || '99:99'));
  }, [pending, todayISO]);

  const upcomingTasks = useMemo(() => {
    return pending
      .filter((t) => (t.scheduledDate || '') > todayISO)
      .sort((a, b) => {
        const da = a.scheduledDate || '';
        const db = b.scheduledDate || '';
        if (da !== db) return da.localeCompare(db);
        return (a.scheduledTime || '99:99').localeCompare(b.scheduledTime || '99:99');
      });
  }, [pending, todayISO]);

  const unscheduledTasks = useMemo(() => {
    return pending
      .filter((t) => !t.scheduledDate && !t.scheduledTime)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [pending]);

  const todayCount = getTasksCountForDate(todayISO);

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <h1 className="text-2xl font-display font-semibold text-foreground mb-2 animate-fade-in">
        Tareas
      </h1>
      
      <p className="text-muted-foreground text-sm mb-4 animate-fade-in">
        Escribe solo el primer paso. Cada bloque aparece en tu horario.
      </p>

      {/* Today counter */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-muted/40 animate-slide-up">
        <span className="text-sm text-muted-foreground">Bloques hoy</span>
        <span className={`text-sm font-semibold ${todayCount >= MAX_TASKS_PER_DAY ? 'text-destructive' : 'text-foreground'}`}>
          {todayCount}/{MAX_TASKS_PER_DAY}
        </span>
      </div>
      
      {/* Compact form */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 mb-6 animate-slide-up">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="¿Cuál es el primer paso?"
              className="focus-input mt-2"
              maxLength={120}
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setLimitError(null);
                }}
                onBlur={() => setTouched(true)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground"
              />
              {date && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {getTasksCountForDate(date)}/5 en este día
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onBlur={() => setTouched(true)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground"
              />
              {errors.time && <p className="mt-1 text-xs text-destructive">{errors.time}</p>}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">Duración (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                onBlur={() => setTouched(true)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground"
                placeholder="Ej: 25"
                min={1}
                max={180}
              />
              {errors.duration && <p className="mt-1 text-xs text-destructive">{errors.duration}</p>}
            </div>

            <button
              onClick={handleAddTask}
              disabled={!title.trim() || isAtLimit}
              className="p-4 rounded-xl bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-focus"
              title={isAtLimit ? 'Límite alcanzado' : 'Agregar'}
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Limit error message */}
          {limitError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertCircle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-line">{limitError}</p>
            </div>
          )}

          {/* Info about blocks */}
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
            Con fecha, hora y duración se genera un bloque en tu horario.
          </p>
        </div>
      </div>
      
      {/* Hoy */}
      <section className="mb-8 animate-slide-up stagger-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Hoy</h3>
          <span className="text-xs text-muted-foreground">{todayTasks.length} bloques</span>
        </div>
        {todayTasks.length > 0 ? (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                showFocusButton={false}
                meta={formatChip(task)}
                onPress={() => setSelectedTask(task)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">No tienes bloques para hoy.</p>
          </div>
        )}
      </section>

      {/* Próximas */}
      <section className="mb-8 animate-slide-up stagger-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Próximas</h3>
        {upcomingTasks.length > 0 ? (
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                showFocusButton={false}
                meta={formatChip(task)}
                onPress={() => setSelectedTask(task)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">Sin tareas futuras.</p>
          </div>
        )}
      </section>

      {/* Sin programar */}
      {unscheduledTasks.length > 0 && (
        <section className="mb-8 animate-slide-up stagger-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Sin programar</h3>
          <div className="space-y-3">
            {unscheduledTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onStartFocus={(txt) => setSelectedTask({ ...task, text: txt })}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Completed tasks */}
      {done.length > 0 && (
        <details className="mt-8 animate-slide-up stagger-4">
          <summary className="text-sm font-medium text-muted-foreground mb-3 cursor-pointer select-none">
            Completadas ({done.length})
          </summary>
          <div className="space-y-2">
            {done
              .slice()
              .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
              .map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggleTask}
                  onDelete={onDeleteTask}
                  showFocusButton={false}
                  meta={formatChip(task) || undefined}
                />
              ))}
          </div>
        </details>
      )}

      <StartFocusDialog
        open={!!selectedTask}
        onOpenChange={(o) => !o && setSelectedTask(null)}
        title={selectedTask?.text || ''}
        suggestedMinutes={selectedTask?.durationMinutes ?? 5}
        onStart={(mins) => {
          if (!selectedTask) return;
          onStartFocus(selectedTask.text, mins);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
