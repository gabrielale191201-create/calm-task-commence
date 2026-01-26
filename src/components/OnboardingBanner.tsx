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
    <div className="bg-accent/60 border-b border-primary/20 px-6 py-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground leading-relaxed">
            Esto no es para hacer más.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Es para <span className="font-medium">terminar sin sobrecargarte</span>.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 mt-3">
            <li>• Máximo <span className="font-medium text-foreground">5 actividades por día</span>.</li>
            <li>• Cada tarea ocupa un bloque de tiempo.</li>
            <li>• Como un horario de clases.</li>
          </ul>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Cerrar"
        >
          <X size={18} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
