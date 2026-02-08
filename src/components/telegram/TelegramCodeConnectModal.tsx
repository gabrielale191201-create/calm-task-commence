import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, MessageCircle, ExternalLink, AlertCircle } from 'lucide-react';

interface TelegramCodeConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkCode: string | null;
  isVerifying: boolean;
  verificationError: string | null;
  onVerify: () => Promise<boolean>;
  onSuccess: () => void;
}

export function TelegramCodeConnectModal({
  open,
  onOpenChange,
  linkCode,
  isVerifying,
  verificationError,
  onVerify,
  onSuccess,
}: TelegramCodeConnectModalProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleVerify = async () => {
    const success = await onVerify();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        onOpenChange(false);
      }, 1500);
    }
  };

  const handleOpenTelegram = () => {
    if (linkCode) {
      window.open(`https://t.me/focusonnowbot?start=${linkCode}`, '_blank');
    }
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">¡Conectado!</DialogTitle>
            <DialogDescription className="text-center">
              Ya puedes recibir recordatorios por Telegram.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Conectar Telegram</DialogTitle>
          <DialogDescription className="text-center">
            Te enviaremos recordatorios suaves para que no olvides tus tareas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instrucciones */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </span>
              <p className="text-sm text-muted-foreground">
                Abre Telegram y busca <strong>@focusonnowbot</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </span>
              <p className="text-sm text-muted-foreground">
                Presiona <strong>Start</strong> o <strong>Iniciar</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                3
              </span>
              <p className="text-sm text-muted-foreground">
                Vuelve aquí y verifica la conexión
              </p>
            </div>
          </div>

          {/* Código de vinculación */}
          {linkCode && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Tu código:</p>
              <code className="text-lg font-mono font-bold text-primary">{linkCode}</code>
            </div>
          )}

          {/* Error de verificación */}
          {verificationError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{verificationError}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleOpenTelegram}
            variant="outline"
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir Telegram
          </Button>
          
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar conexión'
            )}
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
