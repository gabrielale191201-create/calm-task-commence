import { cn } from '@/lib/utils';
import { Task } from '@/types/focuson';

interface TimeBlockProps {
  task: Task;
  rowSpan: number;
  onClick?: () => void;
}

const statusStyles: Record<Task['status'], { bg: string; border: string; text: string; label: string }> = {
  pending: {
    bg: 'bg-primary/15',
    border: 'border-l-primary',
    text: 'text-foreground',
    label: 'Pendiente',
  },
  in_progress: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-l-amber-500',
    text: 'text-foreground',
    label: 'En proceso',
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-l-green-500',
    text: 'text-foreground/70',
    label: 'Completada',
  },
};

export function TimeBlock({ task, rowSpan, onClick }: TimeBlockProps) {
  const style = statusStyles[task.status];
  const isCompleted = task.status === 'completed';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border-l-4 px-2.5 py-2 transition-all hover:shadow-sm',
        style.bg,
        style.border,
        isCompleted && 'opacity-80'
      )}
      style={{ gridRow: `span ${rowSpan}` }}
    >
      <p className={cn('text-xs font-medium truncate leading-tight', style.text, isCompleted && 'line-through')}>
        {task.text}
      </p>
      {task.scheduledTime && task.durationMinutes && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {task.scheduledTime} · {task.durationMinutes}m
        </p>
      )}
      <span className={cn(
        'inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full',
        isCompleted 
          ? 'text-green-700 dark:text-green-300 bg-green-500/15' 
          : task.status === 'in_progress'
            ? 'text-amber-700 dark:text-amber-300 bg-amber-500/15'
            : 'text-primary bg-primary/10'
      )}>
        {style.label}
      </span>
    </button>
  );
}
