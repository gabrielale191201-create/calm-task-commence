import { Check, Play, Trash2 } from 'lucide-react';
import { Task } from '@/types/focuson';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartFocus?: (task: string) => void;
  showFocusButton?: boolean;
}

export function TaskItem({ task, onToggle, onDelete, onStartFocus, showFocusButton = true }: TaskItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 transition-all duration-300",
      task.completed && "opacity-60"
    )}>
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "task-checkbox flex-shrink-0",
          task.completed && "checked"
        )}
      >
        {task.completed && <Check size={14} className="text-white" />}
      </button>
      
      <span className={cn(
        "flex-1 text-foreground transition-all duration-300",
        task.completed && "line-through text-muted-foreground"
      )}>
        {task.text}
      </span>
      
      <div className="flex items-center gap-2">
        {showFocusButton && !task.completed && onStartFocus && (
          <button
            onClick={() => onStartFocus(task.text)}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Iniciar enfoque con esta tarea"
          >
            <Play size={16} />
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
