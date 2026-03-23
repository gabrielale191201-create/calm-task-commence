import { useState } from 'react';
import { Lock, Brain, Flame, Timer, Shield, Sparkles, Trophy, Target, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PremiumPaywall } from '@/components/PremiumPaywall';
import { CoachContentReader, coachContentLibrary } from '@/components/CoachContentReader';

interface CoachCard {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
}

const coachCards: CoachCard[] = [
  {
    id: '1',
    title: 'Destruye la Procrastinación',
    subtitle: 'Audio · 8 min',
    icon: Flame,
    gradient: 'from-orange-500/20 to-red-500/10',
  },
  {
    id: '2',
    title: 'Reseteo de 5 Minutos',
    subtitle: 'Ejercicio guiado · 5 min',
    icon: Timer,
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    id: '3',
    title: 'Disciplina Implacable',
    subtitle: 'Lectura · 6 min',
    icon: Shield,
    gradient: 'from-purple-500/20 to-indigo-500/10',
  },
  {
    id: '4',
    title: 'Mentalidad de Alto Rendimiento',
    subtitle: 'Audio · 12 min',
    icon: Brain,
    gradient: 'from-emerald-500/20 to-teal-500/10',
  },
  {
    id: '5',
    title: 'Elimina el Ruido Mental',
    subtitle: 'Ejercicio · 4 min',
    icon: Sparkles,
    gradient: 'from-amber-500/20 to-yellow-500/10',
  },
  {
    id: '6',
    title: 'Ritual de Enfoque Diario',
    subtitle: 'Rutina guiada · 10 min',
    icon: Target,
    gradient: 'from-rose-500/20 to-pink-500/10',
  },
  {
    id: '7',
    title: 'Mentalidad de Campeón',
    subtitle: 'Audio · 15 min',
    icon: Trophy,
    gradient: 'from-sky-500/20 to-blue-500/10',
  },
  {
    id: '8',
    title: 'Control Total de tu Día',
    subtitle: 'Lectura · 7 min',
    icon: Shield,
    gradient: 'from-violet-500/20 to-purple-500/10',
  },
];

export function CoachPage() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeContent, setActiveContent] = useState<string | null>(null);

  const handleCardClick = (cardId: string) => {
    if (coachContentLibrary[cardId]) {
      setActiveContent(cardId);
    } else {
      setShowPaywall(true);
    }
  };

  return (
    <div className="px-4 pb-32 pt-4">
      {/* Premium header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          <Sparkles size={14} />
          Premium
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Mindset Coach
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Entrena tu mente con contenido de alto rendimiento diseñado para personas que ejecutan.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {coachCards.map((card) => {
          const Icon = card.icon;
          const hasContent = !!coachContentLibrary[card.id];
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={cn(
                "relative flex flex-col items-start p-4 rounded-2xl border border-border/30 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-md",
                "bg-gradient-to-br",
                card.gradient
              )}
            >
              {/* Lock or Read icon */}
              <div className="absolute top-3 right-3">
                {hasContent ? (
                  <BookOpen size={14} className="text-primary/60" />
                ) : (
                  <Lock size={14} className="text-muted-foreground/50" />
                )}
              </div>

              <div className="w-10 h-10 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center mb-3">
                <Icon size={20} className="text-foreground/70" />
              </div>

              <h3 className="text-sm font-semibold text-foreground leading-tight mb-1">
                {card.title}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {card.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Content Reader */}
      <CoachContentReader
        open={!!activeContent}
        onClose={() => setActiveContent(null)}
        content={activeContent ? coachContentLibrary[activeContent] : null}
      />

      {/* Paywall for locked cards */}
      <PremiumPaywall open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
