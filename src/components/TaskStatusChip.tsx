import { Task } from '@/types/focuson';
import { cn } from '@/lib/utils';

interface TaskStatusChipProps {
  status: Task['status'];
  onChange: (newStatus: Task['status']) => void;
}

const statusConfig: Record<Task['status'], { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-muted text-muted-foreground hover:bg-muted/80',
  },
  in_progress: {
    label: 'En proceso',
    className: 'bg-primary/15 text-primary hover:bg-primary/25',
  },
  completed: {
    label: 'Completada',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50',
  },
};

const cycleOrder: Task['status'][] = ['pending', 'in_progress', 'completed'];

export function TaskStatusChip({ status, onChange }: TaskStatusChipProps) {
  const config = statusConfig[status];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = cycleOrder.indexOf(status);
    const nextIndex = (currentIndex + 1) % cycleOrder.length;
    onChange(cycleOrder[nextIndex]);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors',
        config.className
      )}
      title="Cambiar estado"
    >
      {config.label}
    </button>
  );
}
