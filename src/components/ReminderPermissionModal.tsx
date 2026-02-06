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
  const closeReasonRef = useRef<CloseReason>(null);

  const close = (reason: CloseReason) => {
    closeReasonRef.current = reason;
    onOpenChange(false);
  };

  const handleActivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.info('REMINDERS_ACTIVATE_CLICK');

    // Mark reason BEFORE closing; otherwise onOpenChange(false) could be treated as dismiss.
    close('activate');

    // Run activation after close to avoid overlay conflicts.
    setTimeout(() => {
      onActivate?.();
    }, 0);
  };

  const handleDismissClick = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    console.info('REMINDERS_DISMISS_CLICK');

    // Guard: dismiss must never activate
    if (process.env.NODE_ENV === 'development') {
      // Intentionally left as an explicit guard location.
    }

    close('dismiss');
    onDismiss?.();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      const reason = closeReasonRef.current;
      closeReasonRef.current = null;

      // If the dialog closed without an explicit button action, treat as dismiss.
      if (reason === null) {
        console.info('REMINDERS_DISMISS_CLICK');
        onDismiss?.();
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
            <AlertDialogCancel
              className="mt-0 flex-1"
              onClick={(e) => handleDismissClick(e)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              Ahora no
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1"
              onClick={handleActivateClick}
              onPointerDown={(e) => e.stopPropagation()}
            >
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
          <AlertDialogAction
            onClick={(e) => {
              e.stopPropagation();
              console.info('REMINDERS_DISMISS_CLICK');
              close('dismiss');
              onDismiss?.();
            }}
          >
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

