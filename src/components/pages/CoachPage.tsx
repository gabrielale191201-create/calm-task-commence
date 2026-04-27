import { useState } from 'react';
import { Lock, Brain, Flame, Timer, Shield, Sparkles, Trophy, Target, BookOpen, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PremiumPaywall } from '@/components/PremiumPaywall';
import { CoachContentReader, coachContentLibrary } from '@/components/CoachContentReader';

interface CoachCard {
  id: string;
  title: string;
  description: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  category: 'mentalidad' | 'foco' | 'habitos';
}

const coachCards: CoachCard[] = [
  {
    id: '1',
    title: 'Destruye la Procrastinación',
    description: 'El método que usan los que más producen para arrancar sin esperar motivación.',
    subtitle: 'Lectura · 8 min',
    icon: Flame,
    gradient: 'from-orange-600 to-red-700',
    category: 'foco',
  },
  {
    id: '2',
    title: 'Reseteo de 5 Minutos',
    description: 'Cuando tu mente colapsa, este ejercicio te devuelve al presente en minutos.',
    subtitle: 'Ejercicio guiado · 5 min',
    icon: Timer,
    gradient: 'from-sky-600 to-blue-800',
    category: 'foco',
  },
  {
    id: '3',
    title: 'Disciplina Implacable',
    description: 'No necesitas fuerza de voluntad. Necesitas un sistema. Aquí está.',
    subtitle: 'Lectura · 6 min',
    icon: Shield,
    gradient: 'from-purple-600 to-indigo-800',
    category: 'mentalidad',
  },
  {
    id: '4',
    title: 'Mentalidad de Alto Rendimiento',
    description: 'Cómo piensan los que ejecutan bajo presión sin quemarse en el intento.',
    subtitle: 'Lectura · 12 min',
    icon: Brain,
    gradient: 'from-emerald-600 to-teal-800',
    category: 'mentalidad',
  },
  {
    id: '5',
    title: 'Elimina el Ruido Mental',
    description: 'Un ejercicio para vaciar la mente y entrar en modo ejecución en 4 minutos.',
    subtitle: 'Ejercicio · 4 min',
    icon: Sparkles,
    gradient: 'from-amber-500 to-orange-700',
    category: 'habitos',
  },
  {
    id: '6',
    title: 'Ritual de Enfoque Diario',
    description: 'La rutina de 10 minutos que separa un día productivo de uno perdido.',
    subtitle: 'Rutina guiada · 10 min',
    icon: Target,
    gradient: 'from-rose-600 to-pink-800',
    category: 'habitos',
  },
  {
    id: '7',
    title: 'Mentalidad de Campeón',
    description: 'Los patrones mentales que tienen en común las personas que no se rinden.',
    subtitle: 'Lectura · 15 min',
    icon: Trophy,
    gradient: 'from-yellow-500 to-amber-700',
    category: 'mentalidad',
  },
  {
    id: '8',
    title: 'Control Total de tu Día',
    description: 'Toma el control antes de que el día te controle a ti. Empieza aquí.',
    subtitle: 'Lectura · 7 min',
    icon: Shield,
    gradient: 'from-violet-600 to-purple-800',
    category: 'habitos',
  },
];

const CATEGORIES = [
  { id: 'todos', label: 'Todo' },
  { id: 'mentalidad', label: 'Mentalidad' },
  { id: 'foco', label: 'Foco' },
  { id: 'habitos', label: 'Hábitos' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

export function CoachPage() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeContent, setActiveContent] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('todos');

  const handleCardClick = (cardId: string) => {
    const hasContent = !!coachContentLibrary[cardId];
    if (hasContent) {
      setActiveContent(cardId);
    } else {
      setShowPaywall(true);
    }
  };

  const filtered = activeCategory === 'todos'
    ? coachCards
    : coachCards.filter((c) => c.category === activeCategory);

  const totalMinutes = coachCards.reduce((acc, c) => {
    const mins = parseInt(c.subtitle.match(/\d+/)?.[0] || '0', 10);
    return acc + mins;
  }, 0);

  return (
    <div className="px-4 pb-32 pt-4">
      {/* Hero Header */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-widest">
            <Sparkles size={12} />
            Premium
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground leading-[1.05]">
            Mindset
            <br />
            <span className="text-primary">Coach</span>
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Contenido de alto rendimiento para las personas que no se conforman con menos de lo que pueden dar.
          </p>

          <div className="flex items-center gap-4 pt-2">
            <div>
              <div className="text-xl font-bold text-foreground">{coachCards.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">lecciones</div>
            </div>
            <div className="w-px h-8 bg-border/60" />
            <div>
              <div className="text-xl font-bold text-foreground">{totalMinutes}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">minutos</div>
            </div>
            <div className="w-px h-8 bg-border/60" />
            <div>
              <div className="text-xl font-bold text-foreground">3</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">categorías</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA Banner */}
      <div className="mb-6">
        <button
          onClick={() => setShowPaywall(true)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <Zap size={20} />
            <div className="text-left">
              <div className="text-sm font-bold leading-tight">Acceder a todo el contenido</div>
              <div className="text-[11px] opacity-90">Desde $4.99/mes · Cancela cuando quieras</div>
            </div>
          </div>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-4 -mx-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((card) => {
          const Icon = card.icon;
          const hasContent = !!coachContentLibrary[card.id];
          const isLocked = !hasContent;

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className="relative flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] overflow-hidden group min-h-[180px] border border-border/30"
            >
              {/* Background gradient */}
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', card.gradient)} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

              {/* Blur overlay for locked */}
              {isLocked && <div className="absolute inset-0 backdrop-blur-[1px] bg-black/10" />}

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full w-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon size={20} className="text-white" />
                  </div>
                  {isLocked ? (
                    <Lock size={14} className="text-white/70" />
                  ) : (
                    <BookOpen size={14} className="text-white/90" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-white leading-tight mb-1.5 break-words">
                  {card.title}
                </h3>

                <p className="text-[11px] text-white/80 leading-snug mb-3 break-words line-clamp-2">
                  {card.description}
                </p>

                <p className="text-[10px] text-white/70 mt-auto uppercase tracking-wider font-medium">
                  {card.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom motivational quote */}
      <div className="mt-8 px-2">
        <p className="text-center text-xs italic text-muted-foreground leading-relaxed">
          "La disciplina es elegir entre lo que quieres ahora y lo que más quieres."
        </p>
      </div>

      {/* Content Reader */}
      <CoachContentReader
        open={!!activeContent}
        onClose={() => setActiveContent(null)}
        content={activeContent ? coachContentLibrary[activeContent] : null}
      />

      {/* Paywall */}
      <PremiumPaywall open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
