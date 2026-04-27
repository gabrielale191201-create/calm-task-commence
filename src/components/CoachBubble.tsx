import { useState, useEffect } from 'react';
import { Brain, Sparkles, Zap, Star, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoachBubbleProps {
  onClick: () => void;
  className?: string;
}

const ICONS = [Brain, Sparkles, Zap, Star, BookOpen];
const TIPS = [
  'Mindset Coach',
  'Entrena tu mente',
  '5 min cambian todo',
  '¿Listo para crecer?',
  'Nuevo contenido',
];

export function CoachBubble({ onClick, className }: CoachBubbleProps) {
  const [iconIndex, setIconIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Rotate icons every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setIconIndex((i) => (i + 1) % ICONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Cycle tips: show for 2.5s, hide, then next after 5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
      setShowTip(true);
      const hide = setTimeout(() => setShowTip(false), 2500);
      return () => clearTimeout(hide);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showTip]);

  const Icon = ICONS[iconIndex];

  return (
    <div className={cn('fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2', className)}>
      {/* Tooltip */}
      {showTip && (
        <div className="animate-fade-in">
          <div className="relative px-3 py-2 rounded-xl bg-card border border-border/60 shadow-lg max-w-[180px]">
            <p className="text-xs font-semibold text-foreground whitespace-nowrap">
              {TIPS[tipIndex]}
            </p>
            {/* Tail */}
            <div className="absolute -bottom-1 right-5 w-2 h-2 rotate-45 bg-card border-r border-b border-border/60" />
          </div>
        </div>
      )}

      {/* Bubble wrapper with decorative pulses */}
      <div className="relative">
        {/* Outer ping */}
        <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping pointer-events-none" />
        {/* Soft glow */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/40 to-teal-500/30 blur-md pointer-events-none" />

        <button
          onClick={onClick}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          aria-label="Abrir Mindset Coach"
          className={cn(
            'relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200',
            'bg-gradient-to-br from-primary via-emerald-500 to-teal-600',
            'ring-2 ring-white/20',
            isPressed ? 'scale-90' : 'scale-100 hover:scale-110'
          )}
        >
          {/* Rotating icon */}
          <div key={iconIndex} className="animate-scale-in">
            <Icon size={24} className="text-white drop-shadow-md" strokeWidth={2.2} />
          </div>

          {/* NEW badge */}
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-[8px] font-black text-amber-950 tracking-wider shadow-md">
            NEW
          </span>
        </button>
      </div>
    </div>
  );
}
