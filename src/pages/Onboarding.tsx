import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useProfile } from '@/hooks/useProfile';
import { trackUserEvent } from '@/lib/trackEvent';
import { AppLogo } from '@/components/AppLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';

const AREAS = [
  { id: 'emprendimiento', label: 'Emprendimiento', emoji: '🚀' },
  { id: 'estudios', label: 'Estudios', emoji: '📚' },
  { id: 'trabajo', label: 'Trabajo Corporativo', emoji: '💼' },
  { id: 'personal', label: 'Vida Personal', emoji: '🧘' },
];

const OBSTACLES = [
  { id: 'procrastinacion', label: 'Procrastinación', emoji: '⏳' },
  { id: 'tiempo', label: 'Falta de Tiempo', emoji: '⚡' },
  { id: 'ideas', label: 'Exceso de ideas', emoji: '💡' },
  { id: 'cansancio', label: 'Cansancio', emoji: '😴' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useLocalStorage<string>('focuson-user-name', '');
  const [, setOnboardingDone] = useLocalStorage<boolean>('focuson-onboarding-done', false);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedObstacle, setSelectedObstacle] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const handleNext = () => {
    if (step === 1 && !userName.trim()) return;
    if (step === 2 && !selectedArea) return;
    if (step === 3) {
      if (!selectedObstacle) return;
      setIsFinishing(true);
      // Upsert to Supabase profiles
      updateProfile({ name: userName.trim(), area: selectedArea, obstacle: selectedObstacle });
      // Track onboarding completion
      trackUserEvent('onboarding_completed', { name: userName.trim(), area: selectedArea, obstacle: selectedObstacle });
      setTimeout(() => {
        setOnboardingDone(true);
        navigate('/', { replace: true });
      }, 2000);
      return;
    }
    if (step === 1) trackUserEvent('onboarding_step_name', { name: userName.trim() });
    if (step === 2) trackUserEvent('onboarding_step_area', { area: selectedArea });
    setStep(step + 1);
  };

  if (isFinishing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="animate-pulse mb-6">
          <Sparkles size={48} className="text-primary mx-auto" />
        </div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2 animate-fade-in">
          Configurando tu espacio de alto rendimiento...
        </h2>
        <p className="text-sm text-muted-foreground animate-fade-in">
          Todo listo en un momento, {userName || 'campeón'}.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Step 1: Name */}
        {step === 1 && (
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center">
              <AppLogo size={48} className="mx-auto mb-6" />
              <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                ¿Cómo te gusta que te llamen?
              </h1>
              <p className="text-sm text-muted-foreground">
                Así personalizamos tu experiencia.
              </p>
            </div>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Tu nombre o apodo..."
              className="text-center text-lg h-14 focus-input rounded-2xl"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            />
          </div>
        )}

        {/* Step 2: Area */}
        {step === 2 && (
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                ¿Qué área de tu vida genera más ruido mental hoy?
              </h1>
              <p className="text-sm text-muted-foreground">
                Selecciona la que más te identifique.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area.id)}
                  className={`focus-card p-5 text-center transition-all duration-200 active:scale-[0.97] ${
                    selectedArea === area.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{area.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{area.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Obstacle */}
        {step === 3 && (
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                ¿Cuál es tu mayor obstáculo?
              </h1>
              <p className="text-sm text-muted-foreground">
                Sé honesto. Focus On se adapta a ti.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {OBSTACLES.map((obs) => (
                <button
                  key={obs.id}
                  onClick={() => setSelectedObstacle(obs.id)}
                  className={`focus-card p-5 text-center transition-all duration-200 active:scale-[0.97] ${
                    selectedObstacle === obs.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{obs.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{obs.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next button */}
        <div className="w-full max-w-md mt-10">
          <Button
            onClick={handleNext}
            disabled={
              (step === 1 && !userName.trim()) ||
              (step === 2 && !selectedArea) ||
              (step === 3 && !selectedObstacle)
            }
            className="w-full h-14 text-base rounded-2xl gap-2 btn-primary-focus"
          >
            {step === 3 ? 'Comenzar' : 'Continuar'}
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
