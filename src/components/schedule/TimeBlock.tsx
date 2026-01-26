import { cn } from '@/lib/utils';
import { Task } from '@/types/focuson';

interface TimeBlockProps {
  task: Task;
  rowSpan: number;
  onClick?: () => void;
}

const statusStyles: Record<Task['status'], { bg: string; border: string; text: string }> = {
  pending: {
    bg: 'bg-primary/15',
    border: 'border-primary/30',
    text: 'text-foreground',
  },
  done: {
    bg: 'bg-success-light',
    border: 'border-primary/40',
    text: 'text-foreground/70',
  },
};

export function TimeBlock({ task, rowSpan, onClick }: TimeBlockProps) {
  const style = statusStyles[task.status];
  const isCompleted = task.status === 'done';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border-l-4 px-3 py-2 transition-all hover:shadow-sm',
        style.bg,
        style.border,
        isCompleted && 'opacity-70'
      )}
      style={{ gridRow: `span ${rowSpan}` }}
    >
      <p className={cn('text-sm font-medium truncate', style.text, isCompleted && 'line-through')}>
        {task.text}
      </p>
      {task.scheduledTime && task.durationMinutes && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {task.scheduledTime} · {task.durationMinutes} min
        </p>
      )}
      {isCompleted && (
        <span className="inline-block mt-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Completada
        </span>
      )}
    </button>
  );
}
