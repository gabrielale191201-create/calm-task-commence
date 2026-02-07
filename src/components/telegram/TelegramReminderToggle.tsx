import { useState, useEffect } from 'react';
import { MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTelegramConnection } from '@/hooks/useTelegramConnection';
import { TelegramConnectModal } from './TelegramConnectModal';
import { useAuthState, isGuestMode } from '@/hooks/useAuthState';
import { toast } from 'sonner';

export function TelegramReminderToggle() {
  const { isAuthenticated } = useAuthState();
  const { 
    isConnected, 
    optIn, 
    isLoading, 
    setOptIn, 
    checkConnection 
  } = useTelegramConnection();
  
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const showLoginPrompt = isGuestMode() || !isAuthenticated;

  const handleToggle = async () => {
    if (isToggling || isLoading) return;

    // Si no está conectado, mostrar modal de conexión
    if (!isConnected) {
      setShowConnectModal(true);
      return;
    }

    // Toggle opt-in
    setIsToggling(true);
    const newOptIn = !optIn;
    const success = await setOptIn(newOptIn);
    setIsToggling(false);

    if (success) {
      toast.success(newOptIn ? 'Recordatorios activados' : 'Recordatorios desactivados');
    } else {
      toast.error('No pude cambiar la configuración');
    }
  };

  const handleConnected = () => {
    // Refrescar estado después de conectar
    checkConnection();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between py-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          <MessageCircle 
            size={16} 
            className={optIn && isConnected ? 'text-primary' : 'text-muted-foreground'} 
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Telegram</span>
            {showLoginPrompt ? (
              <span className="text-xs text-muted-foreground">
                Inicia sesión para activar
              </span>
            ) : isConnected ? (
              <span className="text-xs text-muted-foreground">
                {optIn ? 'Recibirás recordatorios' : 'Conectado'}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Recibe recordatorios por Telegram
              </span>
            )}
          </div>
          {optIn && isConnected && (
            <CheckCircle2 size={14} className="text-primary ml-1" />
          )}
        </div>

        {!showLoginPrompt && (
          <Switch
            checked={optIn && isConnected}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            aria-label="Activar recordatorios por Telegram"
          />
        )}
      </div>

      <TelegramConnectModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
        onConnected={handleConnected}
      />
    </>
  );
}
