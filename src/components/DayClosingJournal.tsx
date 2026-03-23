import { useState } from 'react';
import { Sparkles, Trash2, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const AI_RESPONSES = [
  'Hoy hubo fricción, pero ejecutaste. Recuerda que la fatiga mental es un falso límite. Mañana, ataca tu Tarea Principal antes de abrir el correo. Descansa, el sistema funciona.',
  'Descargaste mucha saturación sobre el proyecto. Es normal. Has completado tus bloques de Focus Time, el progreso es invisible hasta que es evidente. Desconéctate ahora.',
];

export function DayClosingJournal() {
  const [text, setText] = useState('');
  const [isDestroying, setIsDestroying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const handleDestroy = () => {
    if (!text.trim()) return;
    setIsDestroying(true);
    setTimeout(() => {
      setText('');
      setIsDestroying(false);
    }, 500);
  };

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setAiResponse(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAiResponse(AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)]);
    }, 2000);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">
          Cierre del Día
        </h3>
        <p className="text-sm text-muted-foreground">
          Suelta lo que quedó en tu mente.
        </p>
      </div>

      {/* Textarea with destroy animation */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="¿Qué quedó en tu mente hoy? Descarga tus frustraciones o victorias aquí..."
          className={`min-h-[120px] bg-muted/50 border-border/30 backdrop-blur-sm resize-none transition-all duration-500 ${
            isDestroying ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
          }`}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleDestroy}
          disabled={!text.trim() || isDestroying}
          className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={16} />
          Destruir pensamientos negativos
        </Button>

        <Button
          onClick={handleAnalyze}
          disabled={!text.trim() || isAnalyzing}
          className="flex-1 gap-2"
        >
          {isAnalyzing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {isAnalyzing ? 'Analizando...' : 'Guardar y Analizar con IA'}
        </Button>
      </div>

      {/* Loading state */}
      {isAnalyzing && (
        <div className="focus-card text-center py-6 animate-fade-in">
          <Loader2 size={24} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground italic">
            La IA está analizando tus patrones...
          </p>
        </div>
      )}

      {/* AI Response */}
      {aiResponse && !isAnalyzing && (
        <div className="focus-card border-primary/20 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">
              Respuesta del Coach IA
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed italic">
            {aiResponse}
          </p>
        </div>
      )}
    </div>
  );
}
