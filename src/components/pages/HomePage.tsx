import { useState } from 'react';
import { ArrowRight, Plus, X } from 'lucide-react';
import { Task, UserProfile } from '@/types/focuson';
import { cn } from '@/lib/utils';

interface HomePageProps {
  profile: UserProfile;
  topThreeTasks: Task[];
  onGoToFocus: () => void;
  onToggleTask: (id: string) => void;
  onAddTask: (text: string) => void;
  onRemoveFromTopThree: (id: string) => void;
}

export function HomePage({
  profile,
  topThreeTasks,
  onGoToFocus,
  onToggleTask,
  onAddTask,
  onRemoveFromTopThree,
}: HomePageProps) {
  const [newTask, setNewTask] = useState('');

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

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      {/* Greeting */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-display font-semibold text-foreground mb-1">
          {greeting}, {profile.name || 'amigo'}
        </h1>
        <p className="text-muted-foreground">{dateString}</p>
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
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">
          Top 3 de hoy
        </h2>
        
        <div className="space-y-3">
          {topThreeTasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl bg-muted/50 transition-all duration-300",
                task.completed && "opacity-60"
              )}
            >
              <button
                onClick={() => onToggleTask(task.id)}
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
    </div>
  );
}
