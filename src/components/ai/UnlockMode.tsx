import { useState, forwardRef } from 'react';
import { X, Loader2, Play, ListPlus, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UnlockModeProps {
  variant?: 'full' | 'compact';
  onWritingModeChange?: (active: boolean) => void;
  onStartFocusTime?: (minutes: number) => void;
  onCreateTask?: (text: string) => void;
}

interface UnlockResponse {
  claridad: string;
  foco: string;
  ritual: string[];
  compromiso: string;
  accion: string;
}

export const UnlockMode = forwardRef<HTMLDivElement, UnlockModeProps>(
  function UnlockMode({ variant = 'full', onWritingModeChange, onStartFocusTime, onCreateTask }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<UnlockResponse | null>(null);

    const handleOpen = () => setIsOpen(true);

    const handleClose = () => {
      setIsOpen(false);
      setResponse(null);
      setInput('');
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
          setResponse(data.response);
        }
      } catch (err) {
        console.error('Failed to process:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleStartFocus = () => {
      onStartFocusTime?.(15);
      handleClose();
    };

    const handleCreateTask = () => {
      if (response?.accion) {
        onCreateTask?.(response.accion);
      }
      handleClose();
    };

    const handleRetry = () => {
      setResponse(null);
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
                    <p className="text-xs text-muted-foreground">Convierte el caos en una acción clara</p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
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
                  <div className="space-y-5 animate-slide-up">
                    {/* 1. Claridad Mental */}
                    <section className="space-y-2">
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Claridad Mental</h4>
                      <p className="text-sm text-foreground leading-relaxed bg-muted/50 rounded-xl px-4 py-3">
                        {response.claridad}
                      </p>
                    </section>

                    {/* 2. Foco Único */}
                    <section className="space-y-2">
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Foco Único</h4>
                      <p className="text-sm text-foreground leading-relaxed bg-muted/50 rounded-xl px-4 py-3">
                        {response.foco}
                      </p>
                    </section>

                    {/* 3. Ritual de Inicio */}
                    <section className="space-y-2">
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Ritual de Inicio</h4>
                      <div className="bg-muted/50 rounded-xl px-4 py-3 space-y-2">
                        {response.ritual.map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-xs font-medium text-primary mt-0.5">{i + 1}.</span>
                            <p className="text-sm text-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* 4. Micro-compromiso */}
                    <section className="space-y-2">
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Micro-compromiso</h4>
                      <p className="text-sm text-foreground font-medium italic bg-accent/50 rounded-xl px-4 py-3">
                        {response.compromiso}
                      </p>
                    </section>

                    {/* 5. Action buttons */}
                    <section className="space-y-3 pt-2">
                      <button
                        onClick={handleStartFocus}
                        className="btn-primary-focus w-full flex items-center justify-center gap-2 text-base"
                      >
                        <Play size={18} />
                        Empezar ahora (Focus Time 15 min)
                      </button>
                      <button
                        onClick={handleCreateTask}
                        className="btn-secondary-focus w-full flex items-center justify-center gap-2"
                      >
                        <ListPlus size={18} />
                        Convertir en tarea
                      </button>
                      <button
                        onClick={handleRetry}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <RefreshCw size={16} />
                        Elegir otra acción
                      </button>
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
