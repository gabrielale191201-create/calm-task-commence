import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Task } from '@/types/focuson';
import { toast } from 'sonner';

interface ReuseTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onReuse: (id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => void;
}

export function ReuseTaskDialog({ open, onOpenChange, task, onReuse }: ReuseTaskDialogProps) {
  const [date, setDate] = useState(task.scheduledDate || '');
  const [time, setTime] = useState(task.scheduledTime || '');
  const [duration, setDuration] = useState(task.durationMinutes?.toString() || '');

  const handleSave = () => {
    const updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>> = {};
    if (date) updates.scheduledDate = date;
    if (time) updates.scheduledTime = time;
    if (duration) {
      const dur = parseInt(duration, 10);
      if (dur > 0) updates.durationMinutes = dur;
    }
    onReuse(task.id, updates);
    toast.success('Lista para volver a hacerla.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">Reutilizar tarea</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Puedes usarla otra vez sin escribirla de nuevo.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm font-medium text-foreground mb-4 break-words">{task.text}</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Fecha (opcional)</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hora (opcional)</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Duración en minutos (opcional)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="25"
              min={1}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/50 text-foreground text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2 px-3 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            Guardar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
