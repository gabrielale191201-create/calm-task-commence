import { useState } from 'react';
import { Sparkles, Play, Send, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIResponse {
  startWith: string;
  forToday: string[];
  pending: string[];
}

interface OrganizationAssistantProps {
  onStartFocusTime: (task: string, minutes: number) => void;
  onSendToTasks: (tasks: string[]) => void;
  onSaveAsNotes: (notes: string[]) => void;
}

export function OrganizationAssistant({
  onStartFocusTime,
  onSendToTasks,
  onSaveAsNotes,
}: OrganizationAssistantProps) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);

  const processWithAI = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('organize-tasks', {
        body: { input: input.trim() }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Error al procesar. Intenta de nuevo.');
        setIsProcessing(false);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        setIsProcessing(false);
        return;
      }

      const organized: AIResponse = {
        startWith: data.startWith || '',
        forToday: data.forToday || [],
        pending: data.pending || [],
      };

      setResponse(organized);
    } catch (err) {
      console.error('Failed to process with AI:', err);
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartFocus = () => {
    if (response?.startWith) {
      onStartFocusTime(response.startWith, 25);
      setResponse(null);
      setInput('');
    }
  };

  const handleSendToTasks = () => {
    if (response?.forToday && response.forToday.length > 0) {
      onSendToTasks(response.forToday);
    }
  };

  const handleSaveNotes = () => {
    if (response?.pending && response.pending.length > 0) {
      onSaveAsNotes(response.pending);
    }
  };

  const handleReset = () => {
    setResponse(null);
    setInput('');
  };

  return (
    <div className="focus-card animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">
            Asistente de organización
          </h3>
        </div>
      </div>

      {!response ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Escríbeme todo lo que tienes pendiente.
            <br />
            Yo lo ordeno y te ayudo a empezar.
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: trabajo, correos, estudio, ideas sueltas…"
            className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            disabled={isProcessing}
          />

          <button
            onClick={processWithAI}
            disabled={!input.trim() || isProcessing}
            className="btn-primary-focus w-full mt-4 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Ordenando...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Ordenar y empezar
              </>
            )}
          </button>
        </>
      ) : (
        <div className="space-y-5 animate-fade-in">
          {/* Empieza con esto */}
          {response.startWith && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-2">Empieza con esto:</p>
              <p className="text-foreground font-medium mb-3">{response.startWith}</p>
              <button
                onClick={handleStartFocus}
                className="btn-primary-focus w-full flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                <Play size={16} />
                Iniciar Focus Time
              </button>
            </div>
          )}

          {/* Para hoy */}
          {response.forToday.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Para hoy:</p>
              <ul className="space-y-1.5 mb-3">
                {response.forToday.map((task, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {task}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSendToTasks}
                className="btn-secondary-focus w-full flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                <Send size={16} />
                Enviar a tareas
              </button>
            </div>
          )}

          {/* Pendientes */}
          {response.pending.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-xs font-medium text-muted-foreground mb-2">Pendientes:</p>
              <ul className="space-y-1.5 mb-3">
                {response.pending.map((note, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span>○</span>
                    {note}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSaveNotes}
                className="w-full py-2.5 text-sm rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                Guardar como notas
              </button>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Escribir algo nuevo
          </button>
        </div>
      )}
    </div>
  );
}
