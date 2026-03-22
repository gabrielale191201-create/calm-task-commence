import { X, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useState } from 'react';

interface PremiumPaywallProps {
  open: boolean;
  onClose: () => void;
}

const benefits = [
  'Mentalidad de élite',
  'Priorización avanzada',
  'Cero excusas',
];

export function PremiumPaywall({ open, onClose }: PremiumPaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-10 pt-6 max-h-[85vh]">
        <SheetHeader className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={28} className="text-primary" />
            </div>
          </div>
          <SheetTitle className="text-xl font-display font-bold text-foreground">
            Desbloquea a tu Coach Personal IA
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Accede a todo el contenido premium y transforma tu rendimiento.
          </SheetDescription>
        </SheetHeader>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check size={14} className="text-primary" />
              </div>
              <span className="text-sm text-foreground font-medium">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Pricing buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={cn(
              "flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-200",
              selectedPlan === 'monthly'
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            )}
          >
            <span className="text-lg font-bold text-foreground">$10</span>
            <span className="text-xs text-muted-foreground">USD / mes</span>
          </button>

          <button
            onClick={() => setSelectedPlan('annual')}
            className={cn(
              "relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-200",
              selectedPlan === 'annual'
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            )}
          >
            <span className="absolute -top-2.5 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Ahorra 75%
            </span>
            <span className="text-lg font-bold text-foreground">$30</span>
            <span className="text-xs text-muted-foreground">USD / año</span>
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="btn-primary-focus w-full text-base"
        >
          Convertirme en Premium
        </button>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Cancela cuando quieras. Sin compromisos.
        </p>
      </SheetContent>
    </Sheet>
  );
}
