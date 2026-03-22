import { useState, useMemo, forwardRef } from 'react';
import { X, Loader2, ListPlus, RefreshCw, Zap, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { UnlockSession, PrioritizedActivity } from '@/types/unlockSession';
import { UnlockHistory } from './UnlockHistory';

interface UnlockModeProps {
  variant?: 'full' | 'compact';
  onWritingModeChange?: (active: boolean) => void;
  onStartFocusTime?: (minutes: number, unlockSessionId?: string) => void;
  onCreateTask?: (text: string) => void;
  sessions: UnlockSession[];
  onSaveSession: (session: UnlockSession) => void;
  onUpdateSession: (id: string, updates: Partial<UnlockSession>) => void;
}

interface UnlockResponse {
  visionInterior: string;
  actividades: PrioritizedActivity[];
  consejoDisciplina: string;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

const LEVEL_LABELS: Record<PrioritizedActivity['level'], string> = {
  esencial: 'Esencial inmediato',
  importante: 'Importante próximo',
  secundario: 'Secundario',
};

const LEVEL_COLORS: Record<PrioritizedActivity['level'], string> = {
  esencial: 'bg-primary/10 text-primary border-primary/20',
  importante: 'bg-accent/50 text-accent-foreground border-accent/30',
  secundario: 'bg-muted/50 text-muted-foreground border-border/50',
};

// Energy tags assigned based on activity level and text length heuristics
const ENERGY_TAGS: { emoji: string; label: string; color: string }[] = [
  { emoji: '🧠', label: 'Alta Carga', color: 'bg-red-500/10 text-red-600 border-red-200' },
  { emoji: '⚡', label: 'Victoria Rápida', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { emoji: '🔋', label: 'Baja Energía', color: 'bg-sky-500/10 text-sky-600 border-sky-200' },
];

function getEnergyTag(activity: PrioritizedActivity, index: number) {
  if (activity.level === 'esencial') return ENERGY_TAGS[0]; // Alta Carga
  if (activity.text.length < 30 || activity.level === 'secundario') return ENERGY_TAGS[1]; // Victoria Rápida
  return ENERGY_TAGS[2]; // Baja Energía
}

export const UnlockMode = forwardRef<HTMLDivElement, UnlockModeProps>(
  function UnlockMode({ variant = 'full', onWritingModeChange, onStartFocusTime, onCreateTask, sessions, onSaveSession, onUpdateSession }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'unlock' | 'history'>('unlock');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<UnlockResponse | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [identityMessage, setIdentityMessage] = useState<string | null>(null);
    const [convertedActivities, setConvertedActivities] = useState<Set<number>>(new Set());

    const todayISO = new Date().toISOString().split('T')[0];
    const todayCount = useMemo(() =>
      sessions.filter(s => s.createdAt.startsWith(todayISO)).length
    , [sessions, todayISO]);

    const weekCount = useMemo(() => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      return sessions.filter(s => new Date(s.createdAt) >= monday).length;
    }, [sessions]);

    const handleOpen = () => setIsOpen(true);

    const handleClose = () => {
      setIsOpen(false);
      setResponse(null);
      setInput('');
      setCurrentSessionId(null);
      setIdentityMessage(null);
      setConvertedActivities(new Set());
      setActiveTab('unlock');
      onWritingModeChange?.(false);
    };

    const handleInputFocus = () => onWritingModeChange?.(true);
    const handleInputBlur = () => onWritingModeChange?.(false);

    const handleSubmit = async () => {
      if (!input.trim() || isLoading) return;

      const userText = input.trim();
      setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke('unlock-mode', {
          body: { message: userText }
        });

        if (error) {
          console.error('Unlock mode error:', error);
          return;
        }

        if (data?.response) {
          const resp = data.response as UnlockResponse;
          setResponse(resp);

          const session: UnlockSession = {
            id: generateId(),
            inputText: userText,
            visionInterior: resp.visionInterior,
            actividades: resp.actividades.map(a => ({ ...a, convertedToTask: false })),
            consejoDisciplina: resp.consejoDisciplina,
            startedFocusTime: false,
            completed: false,
            createdAt: new Date().toISOString(),
          };
          onSaveSession(session);
          setCurrentSessionId(session.id);
        }
      } catch (err) {
        console.error('Failed to process:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleConvertToTask = (index: number, text: string) => {
      onCreateTask?.(text);
      setConvertedActivities(prev => new Set(prev).add(index));
      if (currentSessionId) {
        onUpdateSession(currentSessionId, {
          actividades: response?.actividades.map((a, i) => 
            i === index ? { ...a, convertedToTask: true } : a
          ),
        });
      }
      setIdentityMessage('Elegiste actuar en lugar de posponer.');
      setTimeout(() => setIdentityMessage(null), 1500);
    };

    const handleRetry = () => {
      setResponse(null);
      setCurrentSessionId(null);
      setIdentityMessage(null);
      setConvertedActivities(new Set());
    };

    const renderActivitiesByLevel = (level: PrioritizedActivity['level']) => {
      if (!response) return null;
      const items = response.actividades
        .map((a, i) => ({ ...a, originalIndex: i }))
        .filter(a => a.level === level);
      if (items.length === 0) return null;

      return (
        <div key={level} className="space-y-2">
          <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border inline-block", LEVEL_COLORS[level])}>
            {LEVEL_LABELS[level]}
          </span>
          <div className="space-y-1.5">
            {items.map((activity) => (
              <div key={activity.originalIndex} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2.5">
                <p className="text-sm text-foreground flex-1">{activity.text}</p>
                {convertedActivities.has(activity.originalIndex) ? (
                  <span className="text-[10px] text-primary font-medium shrink-0">✓ Tarea</span>
                ) : (
                  <button
                    onClick={() => handleConvertToTask(activity.originalIndex, activity.text)}
                    className="shrink-0 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                    title="Organizar como tarea"
                  >
                    <ListPlus size={14} />
                    Tarea
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div ref={ref}>
        {/* Floating button */}
        <button
          onClick={handleOpen}
          className={cn(
            "fixed z-40 transition-all",
            variant === 'full'
              ? "bottom-24 left-4 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/90 text-primary-foreground shadow-lg hover:bg-primary hover:scale-105"
              : "bottom-24 left-4 w-12 h-12 rounded-full bg-muted/80 text-muted-foreground shadow-md hover:bg-muted hover:text-foreground flex items-center justify-center"
          )}
          title="Modo Desbloqueo"
        >
          <Zap className={cn("", variant === 'compact' ? "w-5 h-5" : "w-4 h-4")} />
          {variant === 'full' && (
            <span className="text-sm font-medium">Modo Desbloqueo</span>
          )}
        </button>

        {/* Full screen panel */}
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
            <div className="flex flex-col h-full max-w-lg mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-display font-semibold text-foreground text-sm">MODO DESBLOQUEO</h3>
                    <p className="text-xs text-muted-foreground">Claridad mental y orden consciente</p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border/50">
                <button
                  onClick={() => setActiveTab('unlock')}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                    activeTab === 'unlock'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap size={14} />
                  Desbloquear
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                    activeTab === 'history'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <History size={14} />
                  Historial
                  {sessions.length > 0 && (
                    <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">{sessions.length}</span>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* Identity message overlay */}
                {identityMessage && (
                  <div className="fixed inset-0 z-60 flex items-center justify-center bg-background/90 animate-fade-in pointer-events-none">
                    <div className="text-center px-8 animate-scale-in">
                      <Zap size={32} className="mx-auto mb-4 text-primary" />
                      <p className="text-lg font-display font-semibold text-foreground">{identityMessage}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'history' ? (
                  <UnlockHistory
                    sessions={sessions}
                    todayCount={todayCount}
                    weekCount={weekCount}
                    onCreateTask={onCreateTask}
                    onUpdateSession={onUpdateSession}
                  />
                ) : (
                  <>
                    {!response && !isLoading && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="text-center space-y-3 py-4">
                          <h2 className="text-xl font-display font-semibold text-foreground">
                            MODO DESBLOQUEO
                          </h2>
                          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                            Si tu mente está saturada, escríbelo todo aquí. No necesitas ordenarlo.
                          </p>
                        </div>

                        {(todayCount > 0 || weekCount > 0) && (
                          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                            <span>Hoy: <strong className="text-foreground">{todayCount}</strong></span>
                            <span>·</span>
                            <span>Semana: <strong className="text-foreground">{weekCount}</strong></span>
                          </div>
                        )}

                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                          placeholder="Escribe todo lo que te satura: tareas, preocupaciones, ideas sueltas… No necesitas estructura."
                          className="w-full px-4 py-4 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm min-h-[160px]"
                          rows={6}
                        />

                        <button
                          onClick={handleSubmit}
                          disabled={!input.trim()}
                          className="btn-primary-focus w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        >
                          Ordenar mi mente
                        </button>
                      </div>
                    )}

                    {isLoading && (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-fade-in">
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Organizando tu mente…</p>
                      </div>
                    )}

                    {response && !isLoading && (
                      <div className="space-y-6 animate-slide-up">
                        {/* Visión Interior */}
                        <section className="space-y-2">
                          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Visión Interior</h4>
                          <p className="text-sm text-foreground leading-relaxed bg-muted/50 rounded-xl px-4 py-4 italic">
                            {response.visionInterior}
                          </p>
                        </section>

                        {/* Orden Consciente */}
                        <section className="space-y-3">
                          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Orden Consciente</h4>
                          <div className="space-y-4">
                            {renderActivitiesByLevel('esencial')}
                            {renderActivitiesByLevel('importante')}
                            {renderActivitiesByLevel('secundario')}
                          </div>
                        </section>

                        {/* Consejo de Disciplina Interior */}
                        <section className="space-y-2">
                          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Consejo de Disciplina Interior</h4>
                          <p className="text-sm text-foreground font-medium bg-accent/50 rounded-xl px-4 py-3 leading-relaxed">
                            {response.consejoDisciplina}
                          </p>
                        </section>

                        {/* Actions */}
                        <section className="pt-2">
                          <button
                            onClick={handleRetry}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <RefreshCw size={16} />
                            Volver al Desbloqueo
                          </button>
                        </section>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
