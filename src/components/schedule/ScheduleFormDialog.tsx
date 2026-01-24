import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScheduleActivity, ScheduleCategory } from '@/types/focuson';
import { cn } from '@/lib/utils';

const CATEGORIES: ScheduleCategory[] = ['Enfoque', 'Rutina', 'Personal', 'Estudio', 'Trabajo'];

type Draft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: ScheduleCategory;
  note: string;
  canStartFocus: boolean;
};

function isValidTime(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function compareTimes(a: string, b: string) {
  return a.localeCompare(b);
}

export interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  onCreate: (activity: Omit<ScheduleActivity, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
}

export function ScheduleFormDialog({ open, onOpenChange, defaultDate, onCreate }: ScheduleFormDialogProps) {
  const initial: Draft = useMemo(
    () => ({
      title: '',
      date: defaultDate,
      startTime: '09:00',
      endTime: '10:00',
      category: 'Trabajo',
      note: '',
      canStartFocus: true,
    }),
    [defaultDate]
  );

  const [draft, setDraft] = useState<Draft>(initial);
  const [touched, setTouched] = useState(false);

  // Reset when re-opening
  useMemo(() => {
    if (open) {
      setDraft(initial);
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate]);

  const errors = (() => {
    if (!touched) return {} as Record<string, string>;

    const e: Record<string, string> = {};
    if (!draft.title.trim()) e.title = 'Escribe un título breve.';
    if (!draft.date) e.date = 'Elige una fecha.';
    if (!isValidTime(draft.startTime)) e.startTime = 'Hora inválida.';
    if (!isValidTime(draft.endTime)) e.endTime = 'Hora inválida.';
    if (isValidTime(draft.startTime) && isValidTime(draft.endTime) && compareTimes(draft.endTime, draft.startTime) <= 0) {
      e.endTime = 'La hora fin debe ser posterior a inicio.';
    }
    return e;
  })();

  const canSubmit = !errors.title && !errors.date && !errors.startTime && !errors.endTime && !!draft.title.trim();

  const submit = () => {
    setTouched(true);
    if (!canSubmit) return;

    onCreate({
      title: draft.title.trim(),
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      category: draft.category,
      note: draft.note.trim() ? draft.note.trim() : undefined,
      canStartFocus: draft.canStartFocus,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Programar actividad</DialogTitle>
          <DialogDescription>
            Algo pequeño y claro. Esto es solo una guía para tu día.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Título</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              onBlur={() => setTouched(true)}
              className={cn('focus-input mt-2', errors.title && 'border-destructive/50')}
              placeholder="Ej: Abrir el documento"
              maxLength={120}
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Fecha</label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
                onBlur={() => setTouched(true)}
                className={cn('mt-2 w-full px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground', errors.date && 'border-destructive/50')}
              />
              {errors.date && <p className="mt-1 text-xs text-destructive">{errors.date}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <select
                value={draft.category}
                onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value as ScheduleCategory }))}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Inicio</label>
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft((p) => ({ ...p, startTime: e.target.value }))}
                onBlur={() => setTouched(true)}
                className={cn('mt-2 w-full px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground', errors.startTime && 'border-destructive/50')}
              />
              {errors.startTime && <p className="mt-1 text-xs text-destructive">{errors.startTime}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Fin</label>
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft((p) => ({ ...p, endTime: e.target.value }))}
                onBlur={() => setTouched(true)}
                className={cn('mt-2 w-full px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground', errors.endTime && 'border-destructive/50')}
              />
              {errors.endTime && <p className="mt-1 text-xs text-destructive">{errors.endTime}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Nota (opcional)</label>
            <textarea
              value={draft.note}
              onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
              className="mt-2 w-full min-h-[90px] px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground placeholder:text-muted-foreground resize-none"
              placeholder="Un detalle que te ayude a empezar…"
              maxLength={300}
            />
          </div>

          <label className="flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium text-foreground">Iniciar enfoque</p>
              <p className="text-xs text-muted-foreground">Podrás arrancar una sesión desde esta actividad.</p>
            </div>
            <input
              type="checkbox"
              checked={draft.canStartFocus}
              onChange={(e) => setDraft((p) => ({ ...p, canStartFocus: e.target.checked }))}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button onClick={() => onOpenChange(false)} className="btn-secondary-focus flex-1">
              Cancelar
            </button>
            <button onClick={submit} className="btn-primary-focus flex-1">
              Guardar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
