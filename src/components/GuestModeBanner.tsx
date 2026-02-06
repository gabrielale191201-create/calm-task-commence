import { useState, forwardRef } from 'react';
import { X, Cloud } from 'lucide-react';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useNavigate } from 'react-router-dom';

export const GuestModeBanner = forwardRef<HTMLDivElement, {}>(function GuestModeBanner(_, ref) {
  const { isGuest, guestBannerDismissed, dismissGuestBanner, exitGuestMode } = useGuestMode();
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  // Only show for guests who haven't dismissed the banner
  if (!isGuest || guestBannerDismissed || !visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    dismissGuestBanner();
  };

  const handleCreateAccount = () => {
    exitGuestMode();
    navigate('/auth');
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-fade-in">
      <div className="bg-card/95 backdrop-blur-lg border border-border/50 rounded-2xl p-4 shadow-lg max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-muted">
            <Cloud size={18} className="text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-foreground leading-relaxed">
              Esto se guarda solo en este dispositivo.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Si quieres conservarlo y volver cuando lo necesites, puedes crear tu espacio cuando quieras.
            </p>
            <button
              onClick={handleCreateAccount}
              className="text-xs text-primary hover:underline font-medium mt-1"
            >
              Crear mi espacio →
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
});
