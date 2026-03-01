import { useState } from 'react';
import { Sparkles, Send, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIResponse {
  tasks: string[];
}

interface OrganizationAssistantProps {
  onSendToTasks: (tasks: string[]) => void;
}

export function OrganizationAssistant({
  onSendToTasks,
}: OrganizationAssistantProps) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processWithAI = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('organize-tasks', {
        body: { input: input.trim() }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        setError('Error al conectar con el servicio. Intenta de nuevo.');
        setIsProcessing(false);
        return;
      }

      if (data?.error) {
        // Handle specific error types
        if (data.error === 'rate_limited') {
          setError('Has hecho muchas solicitudes. Espera un momento.');
        } else {
          setError(data.error);
        }
        setIsProcessing(false);
        return;
      }

      const organized: AIResponse = {
        tasks: Array.isArray(data?.tasks) ? data.tasks : [],
      };

      setResponse(organized);
      setError(null);
    } catch (err) {
      console.error('Failed to process with AI:', err);
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToTasks = () => {
    if (response?.tasks && response.tasks.length > 0) {
      onSendToTasks(response.tasks);
      toast.success(`${response.tasks.length} tareas enviadas`);
      handleReset();
    }
  };

  const handleReset = () => {
    setResponse(null);
    setInput('');
    setError(null);
  };

  return (
    <div className="focus-card animate-slide-up">
      {!response ? (
        <>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ejemplo: estudiar para el parcial, enviar informe, llamar al cliente, organizar apuntes…"
            className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            disabled={isProcessing}
          />

          {/* Error display with retry */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={processWithAI}
                  className="mt-2 text-xs text-destructive hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  Reintentar
                </button>
              </div>
            </div>
          )}

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
                Ordenar en tareas
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            La IA solo organiza. Tú decides horarios y tiempo después.
          </p>
        </>
      ) : (
        <div className="space-y-5 animate-fade-in">
          {/* Lista de tareas */}
          {response.tasks.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Tareas identificadas:
              </p>
              <ul className="space-y-2 mb-4">
                {response.tasks.map((task, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSendToTasks}
                className="btn-primary-focus w-full flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                <Send size={16} />
                Enviar a Tareas
              </button>
            </div>
          )}

          {response.tasks.length === 0 && (
            <div className="p-4 rounded-xl bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground">
                No se identificaron tareas claras. Intenta ser más específico.
              </p>
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
