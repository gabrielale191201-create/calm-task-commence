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
    <div className="fixed top-[92px] left-0 right-0 z-20 bg-accent/80 backdrop-blur-sm border-b border-primary/20 px-6 py-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Empieza escribiendo.
          </p>
          <p className="text-xs text-muted-foreground">
            Escribe lo que tienes en la cabeza. Focus On lo ordena en tareas para que empieces.
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
