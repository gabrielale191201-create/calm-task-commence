import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRef } from 'react';

interface ReminderPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: 'request' | 'denied';
  onActivate?: () => void;
  onDismiss?: () => void;
}

type CloseReason = 'activate' | 'dismiss' | null;

export function ReminderPermissionModal({
  open,
  onOpenChange,
  variant,
  onActivate,
  onDismiss,
}: ReminderPermissionModalProps) {
  // Single source of truth for what closed the dialog.
  // We DO NOT call onActivate/onDismiss directly from button clicks; instead we mark
  // the reason and let Radix close the dialog, then we run callbacks from onOpenChange.
  const closeReasonRef = useRef<CloseReason>(null);

  const markActivate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.info('REMINDERS_ACTIVATE_CLICK');
    closeReasonRef.current = 'activate';
  };

  const markDismiss = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.info('REMINDERS_DISMISS_CLICK');
    closeReasonRef.current = 'dismiss';

    // Guard: dismiss must never activate.
    if (process.env.NODE_ENV === 'development') {
      // Intentionally explicit: if in the future someone wires dismiss to activation,
      // put a breakpoint here.
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      const reason = closeReasonRef.current;
      closeReasonRef.current = null;

      // Run callbacks after the dialog has actually started closing.
      // This avoids overlay / DOM interaction edge cases.
      if (reason === 'activate') {
        setTimeout(() => onActivate?.(), 0);
      } else {
        // Treat backdrop click / ESC (reason=null) as dismiss.
        setTimeout(() => onDismiss?.(), 0);
      }
    }

    onOpenChange(newOpen);
  };

  if (variant === 'request') {
    return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Activar recordatorios</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Focus On puede avisarte a la hora de tus tareas. Solo recordatorios, sin ruido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0 flex-1" onClick={(e) => markDismiss(e)}>
              Ahora no
            </AlertDialogCancel>
            <AlertDialogAction className="flex-1" onClick={markActivate}>
              Activar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // variant === 'denied'
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">Recordatorios desactivados</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Para activarlos, habilítalos en ajustes del dispositivo para Focus On.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={(e) => markDismiss(e)}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

