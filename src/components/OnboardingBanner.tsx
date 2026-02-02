import { useState } from 'react';
import { X } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useLocalStorage('focuson-onboarding-seen', false);
  const [visible, setVisible] = useState(!dismissed);

  if (!visible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
  };

  return (
    <div className="bg-accent/60 border-b border-primary/20 px-6 py-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">
            Empieza escribiendo.
          </p>
          <p className="text-xs text-muted-foreground">
            Escribe lo que tienes en la cabeza. Focus On lo ordena en tareas para que empieces.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Tú decides el horario y el tiempo después.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Cerrar"
        >
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
