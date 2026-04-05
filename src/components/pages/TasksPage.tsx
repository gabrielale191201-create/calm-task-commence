import { useMemo, useState } from 'react';
import { Plus, Edit2, Check, X, Play, RotateCcw, Star } from 'lucide-react';
import { Task } from '@/types/focuson';
import { TaskItem } from '@/components/TaskItem';
import { TelegramLocalToggle } from '@/components/telegram/TelegramLocalToggle';
import { RemindersChecklist } from '@/components/RemindersChecklist';
import { StartFocusDialog } from '@/components/StartFocusDialog';
import { ReuseTaskDialog } from '@/components/tasks/ReuseTaskDialog';
import { toISODate, parseDateString } from '@/lib/dateUtils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface TasksPageProps {
  tasks: Task[];
  onAddTask: (input: { text: string; scheduledDate?: string; scheduledTime?: string; durationMinutes?: number }) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSetTaskStatus: (id: string, status: Task['status']) => void;
  onUpdateTask?: (id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => void;
  onReuseTask?: (id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => void;
  onStartFocus: (taskText: string, minutes: number) => void;
  getTasksCountForDate: (date: string) => number;
  onTogglePriority?: (id: string, forceException?: boolean) => 'ok' | 'needs_confirmation' | 'max_reached' | undefined;
}

export function TasksPage({ tasks, onAddTask, onToggleTask, onDeleteTask, onSetTaskStatus, onUpdateTask, onReuseTask, onStartFocus, getTasksCountForDate, onTogglePriority }: TasksPageProps) {
  const [title, setTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [reuseTask, setReuseTask] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [confirmPriorityTaskId, setConfirmPriorityTaskId] = useState<string | null>(null);

  const todayISO = toISODate(new Date());

  const handleAddTask = () => {
    if (!title.trim()) return;
    onAddTask({ text: title.trim() });
    setTitle('');
  };

  const handleTogglePriority = (taskId: string) => {
    if (!onTogglePriority) return;
    const result = onTogglePriority(taskId);
    if (result === 'needs_confirmation') {
      setConfirmPriorityTaskId(taskId);
    }
  };

  const handleConfirmException = () => {
    if (!onTogglePriority || !confirmPriorityTaskId) return;
    onTogglePriority(confirmPriorityTaskId, true);
    setConfirmPriorityTaskId(null);
  };

  // Prioritarias: isTopThree + active
  const priorityTasks = tasks.filter(t => t.isTopThree && t.status !== 'completed');
  const priorityIds = new Set(priorityTasks.map(t => t.id));

  // Non-priority active tasks
  const allActiveTasks = tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && !priorityIds.has(t.id));
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Tareas sin programar (non-priority)
  const unprogrammedTasks = useMemo(() => {
    return allActiveTasks.filter(t => !t.scheduledDate || !t.scheduledTime || !t.durationMinutes);
  }, [allActiveTasks]);

  // Tareas programadas para hoy (non-priority)
  const todayTasks = useMemo(() => {
    return allActiveTasks
      .filter(t => t.scheduledDate === todayISO && t.scheduledTime && t.durationMinutes)
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  }, [allActiveTasks, todayISO]);

  // Tareas programadas para el futuro (non-priority)
  const upcomingTasks = useMemo(() => {
    return allActiveTasks
      .filter(t => t.scheduledDate && t.scheduledDate > todayISO && t.scheduledTime && t.durationMinutes)
      .sort((a, b) => {
        if (a.scheduledDate !== b.scheduledDate) return (a.scheduledDate || '').localeCompare(b.scheduledDate || '');
        return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
      });
  }, [allActiveTasks, todayISO]);

  // Sort priority tasks: normal first, then exceptions
  const sortedPriorityTasks = useMemo(() => {
    return [...priorityTasks].sort((a, b) => {
      if (a.isExceptionToday && !b.isExceptionToday) return 1;
      if (!a.isExceptionToday && b.isExceptionToday) return -1;
      return 0;
    });
  }, [priorityTasks]);

  const formatChip = (t: Task) => {
    if (!t.scheduledDate || !t.scheduledTime || !t.durationMinutes) return undefined;
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
        if (dur > 0) updates.durationMinutes = dur;
      }
      onUpdateTask(taskId, updates);
    }
    cancelEditing();
  };

  const handleStartFocus = (task: Task) => {
    if (task.status === 'pending') {
      onSetTaskStatus(task.id, 'in_progress');
    }
    setSelectedTask(task);
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
      
      {/* Simple add form */}
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
            className="p-4 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-focus"
            title="Agregar tarea"
          >
            <Plus size={20} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/30">
          Después de crear la tarea, puedes asignarle fecha, hora y duración.
        </p>
      </div>

      {/* ===== SECCIÓN PRIORITARIAS ===== */}
      {sortedPriorityTasks.length > 0 && (
        <section className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Star size={14} className="fill-primary" />
              Prioritarias
            </h3>
            <span className="text-xs text-muted-foreground">{sortedPriorityTasks.length} tareas</span>
          </div>
          <div className="space-y-3">
            {sortedPriorityTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    task.isExceptionToday
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
                      : 'text-primary bg-primary/10'
                  }`}>
                    {task.isExceptionToday ? 'Excepción' : 'Hoy'}
                  </span>
                </div>
                <TaskItem
                  task={task}
                  onToggle={onToggleTask}
                  onDelete={onDeleteTask}
                  onSetStatus={onSetTaskStatus}
                  meta={formatChip(task)}
                  onPress={() => handleStartFocus(task)}
                />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {!task.scheduledTime && (
                    <button
                      onClick={() => startEditing(task)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Edit2 size={13} />
                      Agregar hora
                    </button>
                  )}
                  <button
                    onClick={() => handleStartFocus(task)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Play size={13} />
                    Focus Time
                  </button>
                  <button
                    onClick={() => handleTogglePriority(task.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X size={13} />
                    Quitar prioridad
                  </button>
                </div>

                {/* Inline editing for scheduling */}
                {editingTaskId === task.id && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-border/30">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Fecha</label>
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Hora</label>
                        <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Minutos</label>
                        <input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="25" min={1}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={cancelEditing}
                        className="flex-1 py-2 px-3 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-1">
                        <X size={14} /> Cancelar
                      </button>
                      <button onClick={() => saveEditing(task.id)} disabled={!editDate || !editTime || !editDuration}
                        className="flex-1 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
                        <Check size={14} /> Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Hora</label>
                        <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Minutos</label>
                        <input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="25" min={1}
                          className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={cancelEditing}
                        className="flex-1 py-2 px-3 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-1">
                        <X size={14} /> Cancelar
                      </button>
                      <button onClick={() => saveEditing(task.id)} disabled={!editDate || !editTime || !editDuration}
                        className="flex-1 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
                        <Check size={14} /> Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <TaskItem
                      task={task}
                      onToggle={onToggleTask}
                      onDelete={onDeleteTask}
                      onSetStatus={onSetTaskStatus}
                      showFocusButton={false}
                    />
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <button onClick={() => startEditing(task)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Programar tarea">
                        <Edit2 size={13} /> Programar
                      </button>
                      <button onClick={() => handleStartFocus(task)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Iniciar Focus Time">
                        <Play size={13} /> Focus Time
                      </button>
                      {onTogglePriority && (
                        <button onClick={() => handleTogglePriority(task.id)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Marcar como prioritaria">
                          <Star size={13} /> Hoy
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Hoy (programadas) */}
      <section className="mb-8 animate-slide-up stagger-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Hoy</h3>
          <span className="text-xs text-muted-foreground">{todayTasks.length} tareas</span>
        </div>
        {todayTasks.length > 0 ? (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-border/50 bg-card p-4">
                <TaskItem task={task} onToggle={onToggleTask} onDelete={onDeleteTask} onSetStatus={onSetTaskStatus} meta={formatChip(task)} onPress={() => handleStartFocus(task)} />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <button onClick={() => handleStartFocus(task)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Play size={13} /> Focus Time
                  </button>
                  {onTogglePriority && !task.isTopThree && (
                    <button onClick={() => handleTogglePriority(task.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Star size={13} /> Hoy
                    </button>
                  )}
                </div>
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
                <TaskItem task={task} onToggle={onToggleTask} onDelete={onDeleteTask} onSetStatus={onSetTaskStatus} meta={formatChip(task)} onPress={() => handleStartFocus(task)} />
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => handleStartFocus(task)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Play size={13} /> Focus Time
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">Sin tareas futuras programadas.</p>
          </div>
        )}
      </section>

      {/* Telegram Reminders Section */}
      <section className="mb-8 animate-slide-up stagger-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Recordatorios externos</h3>
          <TelegramLocalToggle />
        </div>
      </section>

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <details className="mt-8 animate-slide-up stagger-4">
          <summary className="text-sm font-medium text-muted-foreground mb-3 cursor-pointer select-none">
            Completadas ({completedTasks.length})
          </summary>
          <div className="space-y-2">
            {completedTasks
              .slice()
              .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
              .map((task) => (
                <div key={task.id} className="space-y-1">
                  <TaskItem
                    task={task}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    onSetStatus={onSetTaskStatus}
                    showFocusButton={false}
                    meta={formatChip(task)}
                  />
                  {onReuseTask && (
                    <button
                      onClick={() => setReuseTask(task)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 ml-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <RotateCcw size={13} />
                      Reutilizar
                    </button>
                  )}
                </div>
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

      {reuseTask && onReuseTask && (
        <ReuseTaskDialog
          open={!!reuseTask}
          onOpenChange={(o) => !o && setReuseTask(null)}
          task={reuseTask}
          onReuse={onReuseTask}
        />
      )}

      {/* Exception confirmation modal */}
      <AlertDialog open={!!confirmPriorityTaskId} onOpenChange={(o) => !o && setConfirmPriorityTaskId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Ya tienes 3 prioridades hoy.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              ¿Quieres marcar esta también?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleConfirmException}
              className="w-full rounded-xl"
            >
              Marcar
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={() => setConfirmPriorityTaskId(null)}
              className="w-full rounded-xl"
            >
              Deseo mantener solo tres
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
