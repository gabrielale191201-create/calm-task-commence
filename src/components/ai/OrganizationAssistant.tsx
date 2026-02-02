import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
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

  const processWithAI = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('organize-tasks', {
        body: { input: input.trim() },
        headers: {
          'x-beta-token': import.meta.env.VITE_BETA_ACCESS_TOKEN || ''
        }
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
        tasks: data.tasks || [],
      };

      setResponse(organized);
    } catch (err) {
      console.error('Failed to process with AI:', err);
      toast.error('Error de conexión. Intenta de nuevo.');
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
  };

  return (
    <div className="focus-card animate-slide-up">
      {!response ? (
        <>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: trabajo, estudio, estoy cansado, no sé por dónde empezar, tengo muchas cosas"
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
