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
import { Button } from '@/components/ui/button';
import type { PointerEvent } from 'react';

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
  onDismiss,
}: ReminderPermissionModalProps) {
  const activate = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.info('REMINDERS_ACTIVATE_CLICK');
    onOpenChange(false);
    // Next tick: let the dialog start closing before starting system prompts.
    setTimeout(() => onActivate?.(), 0);
  };

  const dismiss = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.info('REMINDERS_DISMISS_CLICK');
    onOpenChange(false);
    setTimeout(() => onDismiss?.(), 0);
  };

  if (variant === 'request') {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Activar recordatorios</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Focus On puede avisarte a la hora de tus tareas. Solo recordatorios, sin ruido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                className="mt-0 flex-1"
                onPointerDown={dismiss}
              >
                Ahora no
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" className="flex-1" onPointerDown={activate}>
                Activar
              </Button>
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
          <AlertDialogTitle className="text-lg">Recordatorios desactivados</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Para activarlos, habilítalos en ajustes del dispositivo para Focus On.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction asChild>
            <Button type="button" onPointerDown={dismiss}>Entendido</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
