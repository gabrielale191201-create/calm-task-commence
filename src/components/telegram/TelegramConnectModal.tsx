import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, MessageCircle } from 'lucide-react';
import { useTelegramConnection } from '@/hooks/useTelegramConnection';
import { toast } from 'sonner';

interface TelegramConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

type ModalStep = 'invite' | 'waiting' | 'success' | 'retry';

export function TelegramConnectModal({ 
  open, 
  onOpenChange,
  onConnected 
}: TelegramConnectModalProps) {
  const [step, setStep] = useState<ModalStep>('invite');
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const { 
    isConnected, 
    isPolling, 
    generateDeepLink, 
    startPolling, 
    checkConnection,
    setOptIn 
  } = useTelegramConnection();

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setStep('invite');
      setDeepLink(null);
    }
  }, [open]);

  // Detectar conexión exitosa
  useEffect(() => {
    if (isConnected && step === 'waiting') {
      setStep('success');
      // Auto-cerrar después de mostrar éxito
      setTimeout(() => {
        setOptIn(true);
        onConnected?.();
        onOpenChange(false);
        toast.success('Listo. Te avisaré a tiempo.');
      }, 1500);
    }
  }, [isConnected, step, onConnected, onOpenChange, setOptIn]);

  // Cuando termina polling sin conexión
  useEffect(() => {
    if (!isPolling && step === 'waiting' && !isConnected) {
      setStep('retry');
    }
  }, [isPolling, step, isConnected]);

  const handleOpenTelegram = async () => {
    const link = await generateDeepLink();
    if (!link) {
      toast.error('No pude generar el enlace. Intenta de nuevo.');
      return;
    }
    
    setDeepLink(link);
    setStep('waiting');
    
    // Abrir Telegram
    window.open(link, '_blank');
    
    // Iniciar polling después de un pequeño delay
    setTimeout(() => {
      startPolling();
    }, 1000);
  };

  const handleRetry = async () => {
    setStep('waiting');
    const connected = await checkConnection();
    if (!connected) {
      startPolling();
    }
  };

  const handleReopen = () => {
    if (deepLink) {
      window.open(deepLink, '_blank');
      setStep('waiting');
      setTimeout(() => startPolling(), 1000);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        {step === 'invite' && (
          <>
            <AlertDialogHeader>
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
              </div>
              <AlertDialogTitle className="text-center">
                Activar recordatorios
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Te envío recordatorios suaves por Telegram para que no olvides tus tareas importantes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleOpenTelegram} className="w-full">
                Abrir Telegram
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Ahora no
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === 'waiting' && (
          <>
            <AlertDialogHeader>
              <div className="flex justify-center mb-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <AlertDialogTitle className="text-center">
                Conectando...
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Toca "Iniciar" en Telegram y vuelve aquí. Detectaré la conexión automáticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </>
        )}

        {step === 'retry' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center">
                ¿Ya lo abriste?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Si ya tocaste "Iniciar" en Telegram, dame un momento para verificar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleRetry} className="w-full">
                Verificar conexión
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReopen}
                className="w-full"
              >
                Abrir Telegram de nuevo
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="w-full text-muted-foreground"
              >
                Cancelar
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <AlertDialogHeader>
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
              </div>
              <AlertDialogTitle className="text-center">
                ¡Conectado!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Ya puedes recibir recordatorios por Telegram.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
