import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Task } from '@/types/focuson';
import { cn } from '@/lib/utils';
import { TaskStatusChip } from '@/components/TaskStatusChip';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSetStatus?: (id: string, status: Task['status']) => void;
  onStartFocus?: (task: string) => void;
  showFocusButton?: boolean;
  showStatusChip?: boolean;
  meta?: string;
  onPress?: () => void;
}

export function TaskItem({ task, onToggle, onDelete, onSetStatus, onStartFocus, showFocusButton = false, showStatusChip = true, meta, onPress }: TaskItemProps) {
  const isCompleted = task.status === 'completed';
  const [justCompleted, setJustCompleted] = useState(false);

  const handleToggle = (id: string) => {
    if (task.status !== 'completed') {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 800);
    }
    onToggle(id);
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-5 rounded-xl border transition-all duration-300",
        "bg-card/60 backdrop-blur-sm border-border/30",
        isCompleted && "opacity-60",
        justCompleted && "task-complete-glow",
        onPress && "cursor-pointer hover:bg-accent/20"
      )}
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => e.key === 'Enter' && onPress() : undefined}
    >
      {/* Completion burst */}
      {justCompleted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          <div className="task-complete-burst" />
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
        className={cn(
          "task-checkbox flex-shrink-0 transition-all duration-300",
          isCompleted && "checked",
          justCompleted && "scale-125"
        )}
      >
        {(isCompleted || justCompleted) && <Check size={14} className="text-primary-foreground" />}
      </button>
      
      <div className="flex-1 min-w-0 overflow-hidden">
        <span className={cn(
          "block text-foreground transition-all duration-300",
          "break-words overflow-wrap-anywhere hyphens-auto",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.text}
        </span>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {showStatusChip && onSetStatus && (
            <TaskStatusChip
              status={task.status}
              onChange={(newStatus) => onSetStatus(task.id, newStatus)}
            />
          )}
          {meta && (
            <span className="inline-flex text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-full">
              {meta}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
