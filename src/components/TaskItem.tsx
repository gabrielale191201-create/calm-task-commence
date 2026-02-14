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

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 transition-all duration-300",
        isCompleted && "opacity-60",
        onPress && "cursor-pointer hover:bg-muted/20"
      )}
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => e.key === 'Enter' && onPress() : undefined}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
        className={cn(
          "task-checkbox flex-shrink-0",
          isCompleted && "checked"
        )}
      >
        {isCompleted && <Check size={14} className="text-white" />}
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
