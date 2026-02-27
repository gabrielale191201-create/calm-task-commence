import { useState, useEffect } from 'react';
import { Play, X, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { CircularTimer } from '@/components/CircularTimer';
import { cn } from '@/lib/utils';

interface FocusPageProps {
  isRunning: boolean;
  timeLeft: number;
  duration: number;
  progress: number;
  task: string;
  isCompleted: boolean;
  soundEnabled: boolean;
  onStartTimer: (minutes: number, task: string) => void;
  onStopTimer: () => void;
  onContinueTimer: (minutes: number) => void;
  onAcknowledgeCompletion: () => void;
  onToggleSound: (enabled: boolean) => void;
  onSaveSession: (task: string, duration: number) => void;
  onMarkTaskCompleted?: () => void;
  unlockSessionId?: string | null;
  onUnlockSessionComplete?: (id: string) => void;
}

const DURATION_PRESETS = [2, 5, 10, 25];

export function FocusPage({
  isRunning,
  timeLeft,
  duration,
  progress,
  task,
  isCompleted,
  soundEnabled,
  onStartTimer,
  onStopTimer,
  onContinueTimer,
  onAcknowledgeCompletion,
  onToggleSound,
  onSaveSession,
  onMarkTaskCompleted,
  unlockSessionId,
  onUnlockSessionComplete,
}: FocusPageProps) {
  const [inputTask, setInputTask] = useState('');
  const [inputMinutes, setInputMinutes] = useState(5);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showTaskCompleteQuestion, setShowTaskCompleteQuestion] = useState(false);
  const [unlockCompleteMessage, setUnlockCompleteMessage] = useState<string | null>(null);
  useEffect(() => {
    if (isCompleted && !showCompletion) {
      setShowCompletion(true);
      onSaveSession(task, duration);
    }
  }, [isCompleted, showCompletion, task, duration, onSaveSession]);

  const handleStart = () => {
    if (inputTask.trim() && inputMinutes > 0) {
      onStartTimer(inputMinutes, inputTask.trim());
    }
  };

  const handleContinue = () => {
    setShowCompletion(false);
    onAcknowledgeCompletion();
  };

  const handleFinish = () => {
    setShowCompletion(false);
    onAcknowledgeCompletion();
    onStopTimer();
    setInputTask('');
    // Show task completion question if callback provided
    if (onMarkTaskCompleted) {
      setShowTaskCompleteQuestion(true);
    }
  };

  const handleMarkCompleted = (yes: boolean) => {
    setShowTaskCompleteQuestion(false);
    if (yes && onMarkTaskCompleted) {
      onMarkTaskCompleted();
    }
  };

  const handleContinueWithTime = (minutes: number) => {
    setShowCompletion(false);
    onAcknowledgeCompletion();
    onContinueTimer(minutes);
  };

  // Task completion question
  if (showTaskCompleteQuestion) {
    return (
      <div className="page-enter min-h-[calc(100vh-100px)] flex flex-col items-center justify-center px-6 pb-32">
        <div className="text-center animate-scale-in max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-primary" />
          </div>
          
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">
            ¿Marcar como completada?
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Tú decides si la tarea está lista.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleMarkCompleted(false)}
              className="btn-secondary-focus flex-1"
            >
              No, seguir después
            </button>
            <button
              onClick={() => handleMarkCompleted(true)}
              className="btn-primary-focus flex-1"
            >
              Sí, completada
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Completion screen
  if (showCompletion) {
    return (
      <div className="page-enter min-h-[calc(100vh-100px)] flex flex-col items-center justify-center px-6 pb-32">
        <div className="text-center animate-scale-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success-light flex items-center justify-center animate-celebrate">
            <CheckCircle2 size={48} className="text-primary" />
          </div>
          
          <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
            Buen avance
          </h2>
          <p className="text-muted-foreground mb-8">
            Puedes cerrar aquí o seguir un poco más.
          </p>
          
          <p className="text-lg font-medium text-foreground mb-8">
            "{task}"
          </p>
          
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleContinueWithTime(mins)}
                  className="duration-preset"
                >
                  +{mins} min
                </button>
              ))}
            </div>
            
            <button
              onClick={handleFinish}
              className="btn-secondary-focus w-full"
            >
              Cerrar Focus Time
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active timer screen - "Estás en Focus Time"
  if (isRunning) {
    return (
      <div className="page-enter min-h-[calc(100vh-100px)] flex flex-col items-center justify-center px-6 pb-32">
        <div className="text-center w-full max-w-sm">
          <p className="text-sm text-primary font-medium mb-2 animate-fade-in">
            Estás en Focus Time
          </p>
          <p className="text-lg text-foreground font-medium mb-8 animate-fade-in">
            "{task}"
          </p>
          
          <div className="mb-10 animate-scale-in">
            <CircularTimer
              timeLeft={timeLeft}
              duration={duration}
              progress={progress}
            />
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleFinish}
              className="btn-secondary-focus w-full"
            >
              Cerrar Focus Time
            </button>
          </div>
          
          {/* Sound toggle */}
          <button
            onClick={() => onToggleSound(!soundEnabled)}
            className="mt-6 flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            Sonido al finalizar: {soundEnabled ? 'Activado' : 'Desactivado'}
          </button>
        </div>
      </div>
    );
  }

  // Setup screen
  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-display font-semibold text-foreground text-center mb-2 animate-fade-in">
          Iniciar Focus Time
        </h2>
        <p className="text-muted-foreground text-center mb-8 animate-fade-in">
          Solo escribe el primer paso.
        </p>
        
        <div className="space-y-6 animate-slide-up">
          {/* Task input */}
          <div>
            <input
              type="text"
              value={inputTask}
              onChange={(e) => setInputTask(e.target.value)}
              placeholder="Ej: Abrir el documento..."
              className="focus-input text-center text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            />
          </div>
          
          {/* Duration selector */}
          <div className="focus-card">
            <label className="block text-sm font-medium text-foreground mb-3 text-center">
              ¿Cuántos minutos?
            </label>
            
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setInputMinutes(Math.max(1, inputMinutes - 1))}
                className="w-10 h-10 rounded-full bg-muted text-foreground hover:bg-accent transition-colors text-xl font-medium"
              >
                −
              </button>
              <input
                type="number"
                value={inputMinutes}
                onChange={(e) => setInputMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center text-3xl font-display font-semibold text-foreground bg-transparent outline-none"
                min="1"
              />
              <button
                onClick={() => setInputMinutes(inputMinutes + 1)}
                className="w-10 h-10 rounded-full bg-muted text-foreground hover:bg-accent transition-colors text-xl font-medium"
              >
                +
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => setInputMinutes(mins)}
                  className={cn(
                    "duration-preset",
                    inputMinutes === mins && "active"
                  )}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
          
          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!inputTask.trim()}
            className="btn-primary-focus w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={20} />
            Iniciar Focus Time
          </button>
          
          {/* Sound toggle */}
          <button
            onClick={() => onToggleSound(!soundEnabled)}
            className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            Sonido al finalizar: {soundEnabled ? 'Activado' : 'Desactivado'}
          </button>
        </div>
      </div>
    </div>
  );
}
