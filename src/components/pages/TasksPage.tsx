import { useMemo, useState } from 'react';
import { Plus, Clock, Calendar, Edit2, Check, X } from 'lucide-react';
import { Task } from '@/types/focuson';
import { TaskItem } from '@/components/TaskItem';
import { TaskReminderToggle } from '@/components/TaskReminderToggleV2';
import { StartFocusDialog } from '@/components/StartFocusDialog';
import { toISODate, parseDateString } from '@/lib/dateUtils';

interface TasksPageProps {
  tasks: Task[];
  onAddTask: (input: { text: string; scheduledDate?: string; scheduledTime?: string; durationMinutes?: number }) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => void;
  onStartFocus: (taskText: string, minutes: number) => void;
  getTasksCountForDate: (date: string) => number;
}

export function TasksPage({ tasks, onAddTask, onToggleTask, onDeleteTask, onUpdateTask, onStartFocus, getTasksCountForDate }: TasksPageProps) {
  const [title, setTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState('');

  const todayISO = toISODate(new Date());

  const handleAddTask = () => {
    if (!title.trim()) return;
    // Solo crear con el nombre - sin fecha, hora ni duración
    onAddTask({ text: title.trim() });
    setTitle('');
  };

  const pending = tasks.filter((t) => t.status === 'pending');
  const done = tasks.filter((t) => t.status === 'done');

  // Tareas sin programar (sin fecha/hora/duración)
  const unprogrammedTasks = useMemo(() => {
    return pending.filter((t) => !t.scheduledDate || !t.scheduledTime || !t.durationMinutes);
  }, [pending]);

  // Tareas programadas para hoy
  const todayTasks = useMemo(() => {
    return pending
      .filter((t) => t.scheduledDate === todayISO && t.scheduledTime && t.durationMinutes)
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  }, [pending, todayISO]);

  // Tareas programadas para el futuro
  const upcomingTasks = useMemo(() => {
    return pending
      .filter((t) => t.scheduledDate && t.scheduledDate > todayISO && t.scheduledTime && t.durationMinutes)
      .sort((a, b) => {
        if (a.scheduledDate !== b.scheduledDate) return (a.scheduledDate || '').localeCompare(b.scheduledDate || '');
        return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
      });
  }, [pending, todayISO]);

  const formatChip = (t: Task) => {
    if (!t.scheduledDate || !t.scheduledTime || !t.durationMinutes) {
      return 'Sin programar';
    }
    const d = parseDateString(t.scheduledDate);
    const day = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const num = d.toLocaleDateString('es-ES', { day: '2-digit' });
    const mon = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    return `${day} ${num} ${mon} · ${t.scheduledTime} · ${t.durationMinutes}m`;
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditDate(task.scheduledDate || '');
    setEditTime(task.scheduledTime || '');
    setEditDuration(task.durationMinutes?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditDate('');
    setEditTime('');
    setEditDuration('');
  };

  const saveEditing = (taskId: string) => {
    if (onUpdateTask) {
      const updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>> = {};
      if (editDate) updates.scheduledDate = editDate;
      if (editTime) updates.scheduledTime = editTime;
      if (editDuration) {
        const dur = parseInt(editDuration, 10);
        if (dur > 0 && dur <= 180) updates.durationMinutes = dur;
      }
      onUpdateTask(taskId, updates);
    }
    cancelEditing();
  };

  const todayCount = getTasksCountForDate(todayISO);

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <h1 className="text-2xl font-display font-semibold text-foreground mb-2 animate-fade-in">
        Tareas
      </h1>
      
      <p className="text-muted-foreground text-sm mb-4 animate-fade-in">
        Tú decides cuándo y cuánto tiempo dedicar a cada tarea.
      </p>

      {/* Today counter */}
      <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 animate-slide-up">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tareas programadas para hoy</span>
          <span className="text-lg font-bold text-primary">{todayCount}</span>
        </div>
      </div>
      
      {/* Simple add form - only title */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 mb-6 animate-slide-up">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground">Nueva tarea</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="¿Qué necesitas hacer?"
              className="focus-input mt-2"
              maxLength={120}
            />
          </div>
          <button
            onClick={handleAddTask}
            disabled={!title.trim()}
            className="p-4 rounded-xl bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-focus"
            title="Agregar tarea"
          >
            <Plus size={20} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/30">
          Después de crear la tarea, puedes asignarle fecha, hora y duración.
        </p>
      </div>

      {/* Sin programar */}
      {unprogrammedTasks.length > 0 && (
        <section className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400">Sin programar</h3>
            <span className="text-xs text-muted-foreground">{unprogrammedTasks.length} tareas</span>
          </div>
          <div className="space-y-3">
            {unprogrammedTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                {editingTaskId === task.id ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground mb-3">{task.text}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Fecha</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Hora</label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Minutos</label>
                        <input
                          type="number"
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                          placeholder="25"
                          min={1}
                          max={180}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={cancelEditing}
                        className="flex-1 py-2 px-3 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-1"
                      >
                        <X size={14} />
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEditing(task.id)}
                        disabled={!editDate || !editTime || !editDuration}
                        className="flex-1 py-2 px-3 rounded-lg bg-primary text-white text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                      >
                        <Check size={14} />
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <TaskItem
                        task={task}
                        onToggle={onToggleTask}
                        onDelete={onDeleteTask}
                        showFocusButton={false}
                        meta="Sin programar"
                      />
                    </div>
                    <button
                      onClick={() => startEditing(task)}
                      className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Programar tarea"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Hoy */}
      <section className="mb-8 animate-slide-up stagger-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Hoy</h3>
          <span className="text-xs text-muted-foreground">{todayTasks.length} tareas</span>
        </div>
        {todayTasks.length > 0 ? (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-border/50 bg-card p-4">
                <TaskItem
                  task={task}
                  onToggle={onToggleTask}
                  onDelete={onDeleteTask}
                  showFocusButton={false}
                  meta={formatChip(task)}
                  onPress={() => setSelectedTask(task)}
                />
                <TaskReminderToggle
                  taskId={task.id}
                  taskText={task.text}
                  scheduledDate={task.scheduledDate}
                  scheduledTime={task.scheduledTime}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">No tienes tareas programadas para hoy.</p>
          </div>
        )}
      </section>

      {/* Próximas */}
      <section className="mb-8 animate-slide-up stagger-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Próximas</h3>
        {upcomingTasks.length > 0 ? (
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-border/50 bg-card p-4">
                <TaskItem
                  task={task}
                  onToggle={onToggleTask}
                  onDelete={onDeleteTask}
                  showFocusButton={false}
                  meta={formatChip(task)}
                  onPress={() => setSelectedTask(task)}
                />
                <TaskReminderToggle
                  taskId={task.id}
                  taskText={task.text}
                  scheduledDate={task.scheduledDate}
                  scheduledTime={task.scheduledTime}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">Sin tareas futuras programadas.</p>
          </div>
        )}
      </section>

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
                  meta={formatChip(task)}
                />
              ))}
          </div>
        </details>
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