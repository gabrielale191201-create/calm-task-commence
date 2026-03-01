import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface StartFocusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  suggestedMinutes?: number;
  onStart: (minutes: number) => void;
}

const PRESETS = [2, 5, 10, 25];

export function StartFocusDialog({ open, onOpenChange, title, suggestedMinutes = 5, onStart }: StartFocusDialogProps) {
  const initial = useMemo(() => {
    const v = Number.isFinite(suggestedMinutes) ? suggestedMinutes : 5;
    return Math.max(1, Math.round(v));
  }, [suggestedMinutes]);

  const [minutes, setMinutes] = useState(initial);

  useEffect(() => {
    if (open) setMinutes(initial);
  }, [open, initial]);

  const start = () => {
    const mins = Math.max(1, minutes || 1);
    onStart(mins);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Focus Time</DialogTitle>
          <DialogDescription>Simple. Sin presión. Elige cuántos minutos.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-sm text-foreground font-medium">{title}</p>
          </div>

          <div className="mt-5 focus-card">
            <label className="block text-sm font-medium text-foreground mb-3 text-center">¿Cuántos minutos?</label>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setMinutes((m) => Math.max(1, m - 1))}
                className="w-10 h-10 rounded-full bg-muted text-foreground hover:bg-accent transition-colors text-xl font-medium"
              >
                −
              </button>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center text-3xl font-display font-semibold text-foreground bg-transparent outline-none"
                min={1}
              />
              <button
                onClick={() => setMinutes((m) => Math.min(180, m + 1))}
                className="w-10 h-10 rounded-full bg-muted text-foreground hover:bg-accent transition-colors text-xl font-medium"
              >
                +
              </button>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {PRESETS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => setMinutes(mins)}
                  className={cn('duration-preset', minutes === mins && 'active')}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => onOpenChange(false)} className="btn-secondary-focus flex-1">
              Cancelar
            </button>
            <button onClick={start} className="btn-primary-focus flex-1">
              Iniciar Focus Time
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
