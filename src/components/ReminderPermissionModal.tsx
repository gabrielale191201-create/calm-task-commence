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
}

export function ReminderPermissionModal({
  open,
  onOpenChange,
  variant,
  onActivate
}: ReminderPermissionModalProps) {
  if (variant === 'request') {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
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
            <AlertDialogCancel className="mt-0 flex-1">
              Ahora no
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={onActivate}
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
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
