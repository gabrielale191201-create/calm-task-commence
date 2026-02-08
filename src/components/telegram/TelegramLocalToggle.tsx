import { useState } from 'react';
import { MessageCircle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTelegramLocalConnection } from '@/hooks/useTelegramLocalConnection';
import { TelegramCodeConnectModal } from './TelegramCodeConnectModal';
import { toast } from 'sonner';

export function TelegramLocalToggle() {
  const {
    isConnected,
    linkCode,
    isVerifying,
    verificationError,
    startLinking,
    verifyConnection,
    disconnect,
  } = useTelegramLocalConnection();

  const [showModal, setShowModal] = useState(false);

  const handleToggle = (checked: boolean) => {
    if (checked && !isConnected) {
      // Iniciar proceso de vinculación
      const deepLink = startLinking();
      setShowModal(true);
      // Abrir Telegram automáticamente
      window.open(deepLink, '_blank');
    } else if (!checked && isConnected) {
      // Desconectar
      disconnect();
      toast.success('Telegram desconectado');
    }
  };

  const handleVerificationSuccess = () => {
    toast.success('¡Listo! Te avisaré a tiempo por Telegram.');
  };

  return (
    <>
      <div className="flex items-center justify-between py-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          <MessageCircle
            size={16}
            className={isConnected ? 'text-primary' : 'text-muted-foreground'}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Telegram</span>
            <span className="text-xs text-muted-foreground">
              {isConnected
                ? 'Recibirás recordatorios'
                : 'Recibe recordatorios por Telegram'}
            </span>
          </div>
          {isConnected && (
            <CheckCircle2 size={14} className="text-primary ml-1" />
          )}
        </div>

        <Switch
          checked={isConnected}
          onCheckedChange={handleToggle}
          aria-label="Activar recordatorios por Telegram"
        />
      </div>

      <TelegramCodeConnectModal
        open={showModal}
        onOpenChange={setShowModal}
        linkCode={linkCode}
        isVerifying={isVerifying}
        verificationError={verificationError}
        onVerify={verifyConnection}
        onSuccess={handleVerificationSuccess}
      />
    </>
  );
}
