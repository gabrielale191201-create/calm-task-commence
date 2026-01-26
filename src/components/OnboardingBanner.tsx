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
          <p className="text-sm font-medium text-foreground">
            Esto no es para hacer más. Es para <span className="text-primary">terminar sin sobrecargarte</span>.
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• Máximo <span className="font-medium text-foreground">5 bloques por día</span></li>
            <li>• Cada tarea genera un bloque en tu horario</li>
            <li>• Como un horario escolar</li>
          </ul>
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
