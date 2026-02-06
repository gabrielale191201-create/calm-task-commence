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

interface ReminderPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: 'request' | 'denied';
  onActivate?: () => void;
  onDismiss?: () => void;
}

export function ReminderPermissionModal({
  open,
  onOpenChange,
  variant,
  onActivate,
  onDismiss
}: ReminderPermissionModalProps) {
  
  const handleActivateClick = () => {
    console.info('[ReminderModal] REMINDERS_ACTIVATE_CLICK');
    // Close modal first, then trigger activation
    onOpenChange(false);
    onActivate?.();
  };

  const handleDismissClick = () => {
    console.info('[ReminderModal] REMINDERS_DISMISS_CLICK');
    // Guard: This should NEVER call onActivate
    if (process.env.NODE_ENV === 'development') {
      // Extra safety check in dev
    }
    onOpenChange(false);
    onDismiss?.();
  };

  if (variant === 'request') {
    return (
      <AlertDialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          // Modal closing without explicit action = dismiss
          console.info('[ReminderModal] REMINDERS_DISMISS_VIA_CLOSE');
          onDismiss?.();
        }
        onOpenChange(newOpen);
      }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">
              Activar recordatorios
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Focus On puede avisarte a la hora de tus tareas. Solo recordatorios, sin ruido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <AlertDialogCancel 
              className="mt-0 flex-1"
              onClick={(e) => {
                e.preventDefault();
                handleDismissClick();
              }}
            >
              Ahora no
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleActivateClick();
              }}
              className="flex-1"
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            Recordatorios desactivados
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Para activarlos, habilítalos en ajustes del dispositivo para Focus On.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => {
            console.info('[ReminderModal] REMINDERS_DENIED_UNDERSTOOD');
            onOpenChange(false);
            onDismiss?.();
          }}>
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
