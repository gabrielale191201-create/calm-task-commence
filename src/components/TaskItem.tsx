import { Check, Play, Trash2 } from 'lucide-react';
import { Task } from '@/types/focuson';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartFocus?: (task: string) => void;
  showFocusButton?: boolean;
  meta?: string;
  onPress?: () => void;
}

export function TaskItem({ task, onToggle, onDelete, onStartFocus, showFocusButton = true, meta, onPress }: TaskItemProps) {
  const isDone = task.status === 'done';

  return (
    <div
      className={cn(
      "flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 transition-all duration-300",
      isDone && "opacity-60",
      onPress && "cursor-pointer hover:bg-muted/20"
    )}
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => e.key === 'Enter' && onPress() : undefined}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "task-checkbox flex-shrink-0",
          isDone && "checked"
        )}
      >
        {isDone && <Check size={14} className="text-white" />}
      </button>
      
      <div className="flex-1 min-w-0 overflow-hidden">
        <span className={cn(
          "block text-foreground transition-all duration-300",
          "break-words overflow-wrap-anywhere hyphens-auto",
          isDone && "line-through text-muted-foreground"
        )}>
          {task.text}
        </span>
        {meta ? (
          <span className="mt-1 inline-flex text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-full">
            {meta}
          </span>
        ) : null}
      </div>
      
      <div className="flex items-center gap-2">
        {showFocusButton && !isDone && onStartFocus && (
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
