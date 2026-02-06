import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ReminderPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: 'request' | 'denied';
  onActivate?: () => void;
  onDismiss?: () => void;
}

/**
 * Custom modal that does NOT use Radix AlertDialog to avoid
 * event-propagation bugs that block button clicks.
 */
export function ReminderPermissionModal({
  open,
  onOpenChange,
  variant,
  onActivate,
  onDismiss,
}: ReminderPermissionModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.info('REMINDERS_DISMISS_VIA_ESC');
        onOpenChange(false);
        onDismiss?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange, onDismiss]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      console.info('REMINDERS_DISMISS_VIA_BACKDROP');
      onOpenChange(false);
      onDismiss?.();
    }
  };

  const handleActivate = () => {
    console.info('REMINDERS_ACTIVATE_CLICK');
    // IMPORTANT: keep this within the user gesture (no setTimeout) so browser permission prompts can open.
    onActivate?.();
    onOpenChange(false);
  };

  const handleDismiss = () => {
    console.info('REMINDERS_DISMISS_CLICK');
    onDismiss?.();
    onOpenChange(false);
  };

  if (variant === 'request') {
    return (
      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in-0"
      >
        <div
          role="alertdialog"
          aria-modal="true"
          className="relative z-50 w-full max-w-sm mx-4 rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95"
        >
          <h2 className="text-lg font-semibold text-foreground mb-2">Activar recordatorios</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Focus On puede avisarte a la hora de tus tareas. Solo recordatorios, sin ruido.
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleDismiss}
            >
              Ahora no
            </Button>
            <Button type="button" className="flex-1" onClick={handleActivate}>
              Activar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // variant === 'denied'
  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in-0"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-sm mx-4 rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95"
      >
        <h2 className="text-lg font-semibold text-foreground mb-2">Recordatorios desactivados</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Para activarlos, habilítalos en ajustes del dispositivo para Focus On.
        </p>
        <Button type="button" className="w-full" onClick={handleDismiss}>
          Entendido
        </Button>
      </div>
    </div>
  );
}
