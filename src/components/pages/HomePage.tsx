import { useMemo, useState } from 'react';
import { ArrowRight, Plus, X } from 'lucide-react';
import { Task, UserProfile } from '@/types/focuson';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HomePageProps {
  profile: UserProfile;
  topThreeTasks: Task[];
  onGoToFocus: () => void;
  onToggleTask: (id: string) => void;
  onAddTask: (text: string) => void;
  onRemoveFromTopThree: (id: string) => void;
  onRequestSchedule: () => void;
  startedStreak: number;
  hasVictoryToday: boolean;
  onStartFocusFromTopTask: (taskText: string, minutes: number) => void;
}

export function HomePage({
  profile,
  topThreeTasks,
  onGoToFocus,
  onToggleTask,
  onAddTask,
  onRemoveFromTopThree,
  onRequestSchedule,
  startedStreak,
  hasVictoryToday,
  onStartFocusFromTopTask,
}: HomePageProps) {
  const [newTask, setNewTask] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [focusMinutes, setFocusMinutes] = useState(5);

  const today = new Date();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  const dateString = `${dayNames[today.getDay()]}, ${today.getDate()} de ${monthNames[today.getMonth()]}`;

  const handleAddTask = () => {
    if (newTask.trim() && topThreeTasks.length < 3) {
      onAddTask(newTask.trim());
      setNewTask('');
    }
  };

  const topThreeCompleted = useMemo(
    () => topThreeTasks.length === 3 && topThreeTasks.every((t) => t.completed),
    [topThreeTasks]
  );

  const openStartFocus = (task: Task) => {
    setSelectedTask(task);
    setFocusMinutes(5);
  };

  const startFocus = () => {
    if (!selectedTask) return;
    const mins = Math.max(1, Math.min(180, focusMinutes || 1));
    onStartFocusFromTopTask(selectedTask.text, mins);
    setSelectedTask(null);
  };

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      {/* Greeting */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-display font-semibold text-foreground mb-1">
          {greeting}, {profile.name || 'amigo'}
        </h1>
        <p className="text-muted-foreground">{dateString}</p>
      </div>

      {/* Small actions + retention */}
      <div className="flex flex-col gap-3 mb-8 animate-slide-up">
        <div className="flex items-center justify-between">
          <button
            onClick={onRequestSchedule}
            className="px-4 py-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
          >
            + Programar actividad
          </button>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Días que empezaste</p>
            <p className="text-sm font-medium text-foreground">{startedStreak} día{startedStreak === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Victoria del día</p>
          <p className="text-sm text-foreground">
            {hasVictoryToday ? (
              <span>
                <span className="mr-2">✅</span>
                He empezado.
              </span>
            ) : (
              <span>
                Elige 2 minutos y empieza.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main motivation */}
      <div className="text-center py-12 mb-8 animate-slide-up">
        <p className="text-3xl font-display font-semibold text-foreground leading-relaxed mb-8">
          Solo empezar.<br />
          <span className="text-primary">Nada más.</span>
        </p>
        
        <button
          onClick={onGoToFocus}
          className="btn-primary-focus inline-flex items-center gap-3 animate-float"
        >
          EMPEZAR AHORA
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Top 3 section */}
      <div className="focus-card animate-slide-up stagger-2">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Top 3 de hoy</h2>
          {topThreeCompleted ? (
            <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full animate-scale-in">
              Todo listo, sin prisa.
            </span>
          ) : null}
        </div>
        
        <div className="space-y-3">
          {topThreeTasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl bg-muted/50 transition-all duration-300",
                task.completed && "opacity-60"
              )}
              onClick={() => openStartFocus(task)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openStartFocus(task)}
            >
              <button
                onClick={() => onToggleTask(task.id)}
                onClickCapture={(e) => e.stopPropagation()}
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
                  task.completed 
                    ? "bg-primary border-primary" 
                    : "border-primary/50"
                )}
              >
                {task.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              
              <span className={cn(
                "flex-1 text-foreground transition-all",
                task.completed && "line-through text-muted-foreground"
              )}>
                {task.text}
              </span>
              
              <button
                onClick={() => onRemoveFromTopThree(task.id)}
                onClickCapture={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          
          {topThreeTasks.length < 3 && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Añade una tarea..."
                className="focus-input flex-1 py-3"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTask.trim()}
                className="p-3 rounded-xl bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-focus"
              >
                <Plus size={20} />
              </button>
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Máximo 3 tareas. Mantén el foco.
        </p>
      </div>

      {/* Start focus from Top 3 dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar enfoque</DialogTitle>
            <DialogDescription>
              Con esta tarea. Simple. Sin presión.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-foreground font-medium">{selectedTask?.text}</p>
            </div>

            <div className="mt-5 focus-card">
              <label className="block text-sm font-medium text-foreground mb-3 text-center">¿Cuántos minutos?</label>
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setFocusMinutes((m) => Math.max(1, m - 1))}
                  className="w-10 h-10 rounded-full bg-muted text-foreground hover:bg-accent transition-colors text-xl font-medium"
                >
                  −
                </button>
                <input
                  type="number"
                  value={focusMinutes}
                  onChange={(e) => setFocusMinutes(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center text-3xl font-display font-semibold text-foreground bg-transparent outline-none"
                  min={1}
                  max={180}
                />
                <button
                  onClick={() => setFocusMinutes((m) => Math.min(180, m + 1))}
                  className="w-10 h-10 rounded-full bg-muted text-foreground hover:bg-accent transition-colors text-xl font-medium"
                >
                  +
                </button>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {[2, 5, 10, 25].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setFocusMinutes(mins)}
                    className={cn('duration-preset', focusMinutes === mins && 'active')}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setSelectedTask(null)} className="btn-secondary-focus flex-1">
                Cancelar
              </button>
              <button onClick={startFocus} className="btn-primary-focus flex-1">
                Iniciar enfoque
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
