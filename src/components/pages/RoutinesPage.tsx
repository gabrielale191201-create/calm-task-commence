import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, Check } from 'lucide-react';
import { Routine, RoutineStep } from '@/types/focuson';
import { cn } from '@/lib/utils';

interface RoutinesPageProps {
  routines: Routine[];
  onAddRoutine: (name: string) => void;
  onDeleteRoutine: (id: string) => void;
  onAddStep: (routineId: string, text: string) => void;
  onToggleStep: (routineId: string, stepId: string) => void;
  onDeleteStep: (routineId: string, stepId: string) => void;
}

export function RoutinesPage({
  routines,
  onAddRoutine,
  onDeleteRoutine,
  onAddStep,
  onToggleStep,
  onDeleteStep,
}: RoutinesPageProps) {
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [newStepText, setNewStepText] = useState<{ [key: string]: string }>({});

  const handleAddRoutine = () => {
    if (newRoutineName.trim()) {
      onAddRoutine(newRoutineName.trim());
      setNewRoutineName('');
      setShowNewRoutine(false);
    }
  };

  const handleAddStep = (routineId: string) => {
    const text = newStepText[routineId];
    if (text?.trim()) {
      onAddStep(routineId, text.trim());
      setNewStepText({ ...newStepText, [routineId]: '' });
    }
  };

  const getCompletionPercentage = (routine: Routine) => {
    if (routine.steps.length === 0) return 0;
    const completed = routine.steps.filter(s => s.completed).length;
    return Math.round((completed / routine.steps.length) * 100);
  };

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Rutinas
          </h1>
          <p className="text-muted-foreground text-sm">
            Hábitos sin tiempo · Solo hecho o no hecho
          </p>
        </div>
        <button
          onClick={() => setShowNewRoutine(!showNewRoutine)}
          className="p-3 rounded-xl bg-primary text-white hover:shadow-focus transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* New routine form */}
      {showNewRoutine && (
        <div className="focus-card mb-6 animate-scale-in">
          <h3 className="font-medium text-foreground mb-4">Nueva rutina</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRoutine()}
              placeholder="Nombre de la rutina (ej: Estirar, Meditar)"
              className="focus-input"
            />
            <p className="text-xs text-muted-foreground">
              Las rutinas no tienen duración. Solo se marcan como hechas o no hechas.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleAddRoutine}
                disabled={!newRoutineName.trim()}
                className="btn-primary-focus flex-1 py-3 text-base disabled:opacity-50"
              >
                Crear rutina
              </button>
              <button
                onClick={() => setShowNewRoutine(false)}
                className="btn-secondary-focus px-6"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routines list */}
      <div className="space-y-4">
        {routines.map((routine) => {
          const isExpanded = expandedRoutine === routine.id;
          const percentage = getCompletionPercentage(routine);

          return (
            <div key={routine.id} className="focus-card animate-slide-up">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedRoutine(isExpanded ? null : routine.id)}
              >
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{routine.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {routine.steps.length} pasos
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Progress indicator */}
                  <div className="text-right">
                    <span className={cn(
                      "text-lg font-semibold",
                      percentage === 100 ? "text-primary" : "text-foreground"
                    )}>
                      {percentage}%
                    </span>
                  </div>
                  
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={20} className="text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                  <div className="space-y-2 mb-4">
                    {routine.steps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStep(routine.id, step.id);
                          }}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                            step.completed
                              ? "bg-primary border-primary"
                              : "border-primary/50"
                          )}
                        >
                          {step.completed && <Check size={12} className="text-white" />}
                        </button>
                        <span className={cn(
                          "flex-1 text-sm",
                          step.completed && "line-through text-muted-foreground"
                        )}>
                          {step.text}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStep(routine.id, step.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add step */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newStepText[routine.id] || ''}
                      onChange={(e) => setNewStepText({ ...newStepText, [routine.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStep(routine.id)}
                      placeholder="Añadir paso..."
                      className="focus-input flex-1 py-2 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddStep(routine.id);
                      }}
                      className="p-2 rounded-lg bg-primary text-white"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Delete routine */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRoutine(routine.id);
                    }}
                    className="mt-4 w-full py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    Eliminar rutina
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {routines.length === 0 && !showNewRoutine && (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-muted-foreground mb-4">
              No tienes rutinas todavía.<br />
              Crea una pequeña para empezar.
            </p>
            <button
              onClick={() => setShowNewRoutine(true)}
              className="btn-secondary-focus"
            >
              Crear mi primera rutina
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
