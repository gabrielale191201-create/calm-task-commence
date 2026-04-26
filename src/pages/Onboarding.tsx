import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useProfile } from '@/hooks/useProfile';
import { trackUserEvent } from '@/lib/trackEvent';
import { AppLogo } from '@/components/AppLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, ArrowLeft, Sparkles, CheckCircle } from 'lucide-react';

const USER_TYPES = [
  { id: 'profesional', label: 'Profesional', emoji: '💼', desc: 'Trabajo en empresa o institución' },
  { id: 'emprendedor', label: 'Emprendedor', emoji: '🚀', desc: 'Tengo mi propio negocio o proyecto' },
  { id: 'estudiante', label: 'Estudiante', emoji: '📚', desc: 'Estudio y quiero rendir mejor' },
  { id: 'personal', label: 'Crecimiento Personal', emoji: '🧘', desc: 'Quiero organizarme mejor' },
];

const AREAS = [
  { id: 'emprendimiento', label: 'Emprendimiento', emoji: '🚀', desc: 'Proyectos y negocios propios' },
  { id: 'estudios', label: 'Estudios', emoji: '📚', desc: 'Tareas, exámenes y aprendizaje' },
  { id: 'trabajo', label: 'Trabajo', emoji: '💼', desc: 'Responsabilidades laborales' },
  { id: 'personal', label: 'Vida Personal', emoji: '🧘', desc: 'Hábitos y bienestar' },
];

const OBSTACLES = [
  { id: 'procrastinacion', label: 'Procrastinación', emoji: '⏳', desc: 'Postergo lo que debo hacer' },
  { id: 'tiempo', label: 'Falta de Tiempo', emoji: '⚡', desc: 'Nunca alcanza el día' },
  { id: 'ideas', label: 'Exceso de Ideas', emoji: '💡', desc: 'Mi mente no para' },
  { id: 'cansancio', label: 'Cansancio Mental', emoji: '😴', desc: 'Me agoto antes de empezar' },
];

const GOALS = [
  { id: 'terminar_tareas', label: 'Terminar lo que empiezo', emoji: '✅', desc: 'Ejecutar sin dejarlas a medias' },
  { id: 'reducir_ansiedad', label: 'Reducir la ansiedad', emoji: '🧠', desc: 'Ordenar el caos en mi cabeza' },
  { id: 'ser_mas_productivo', label: 'Ser más productivo', emoji: '⚡', desc: 'Hacer más en menos tiempo' },
  { id: 'construir_habitos', label: 'Construir hábitos', emoji: '📈', desc: 'Consistencia día a día' },
];

const FALLBACK_MESSAGES: Record<string, string> = {
  profesional: 'El trabajo no para, pero tu energía sí tiene límites. Empieza hoy escribiendo todo lo que tienes pendiente en Focus On — la IA lo organiza y tú decides qué va primero.',
  emprendedor: 'Los emprendedores tienen mil ideas y poco tiempo. Escribe tus 3 tareas más importantes hoy en Focus On y enfócate solo en esas. El resto puede esperar.',
  estudiante: 'Estudiar con el cerebro saturado no funciona. Empieza por escribir todas tus pendientes en Focus On — la IA las ordena y tú ejecutas una a la vez.',
  personal: 'El primer paso es simple: saca todo lo que tienes en mente y escríbelo en Focus On. La claridad llega sola cuando vacías el caos de tu cabeza.',
};

const LOADING_TEXTS = [
  'Analizando tu perfil...',
  'Entendiendo tu contexto...',
  'Configurando tu espacio...',
  'Preparando tu primer día...',
  'Casi listo...',
];

type Step = 1 | 2 | 3 | 4 | 5;
type Phase = 'steps' | 'loading' | 'welcome';

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const [step, setStep] = useState<Step>(1);
  const [phase, setPhase] = useState<Phase>('steps');
  const [userName, setUserName] = useLocalStorage<string>('focuson-user-name', '');
  const [, setOnboardingDone] = useLocalStorage<boolean>('focuson-onboarding-done', false);
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedObstacle, setSelectedObstacle] = useState<string>('');
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [loadingText, setLoadingText] = useState<string>(LOADING_TEXTS[0]);
  const [progress, setProgress] = useState<number>(0);

  // Animated loading text
  useEffect(() => {
    if (phase !== 'loading') return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_TEXTS.length;
      setLoadingText(LOADING_TEXTS[i]);
    }, 800);
    return () => clearInterval(interval);
  }, [phase]);

  // Animated progress bar
  useEffect(() => {
    if (phase !== 'loading') return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) {
          clearInterval(interval);
          return 95;
        }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [phase]);

  const canAdvance = () => {
    if (step === 1) return userName.trim().length > 0;
    if (step === 2) return selectedUserType !== '';
    if (step === 3) return selectedArea !== '';
    if (step === 4) return selectedObstacle !== '';
    if (step === 5) return selectedGoal !== '';
    return false;
  };

  const handleNext = async () => {
    if (!canAdvance()) return;

    if (step === 1) trackUserEvent('onboarding_step_name', { name: userName.trim() });
    if (step === 2) trackUserEvent('onboarding_step_usertype', { userType: selectedUserType });
    if (step === 3) trackUserEvent('onboarding_step_area', { area: selectedArea });
    if (step === 4) trackUserEvent('onboarding_step_obstacle', { obstacle: selectedObstacle });

    if (step === 5) {
      trackUserEvent('onboarding_step_goal', { goal: selectedGoal });
      trackUserEvent('onboarding_completed', {
        name: userName.trim(),
        userType: selectedUserType,
        area: selectedArea,
        obstacle: selectedObstacle,
        goal: selectedGoal,
      });

      updateProfile({
        name: userName.trim(),
        area: selectedArea,
        obstacle: selectedObstacle,
        userType: selectedUserType,
        goal: selectedGoal,
      });

      setPhase('loading');

      try {
        const { data, error } = await supabase.functions.invoke('generate-welcome', {
          body: {
            name: userName.trim(),
            userType: selectedUserType,
            area: selectedArea,
            obstacle: selectedObstacle,
            goal: selectedGoal,
          },
        });

        if (error) throw error;
        const message =
          (data as any)?.message ||
          FALLBACK_MESSAGES[selectedUserType] ||
          FALLBACK_MESSAGES.personal;
        setWelcomeMessage(message);
        localStorage.setItem('focuson-welcome-message', message);
      } catch {
        const fallback = FALLBACK_MESSAGES[selectedUserType] || FALLBACK_MESSAGES.personal;
        setWelcomeMessage(fallback);
        localStorage.setItem('focuson-welcome-message', fallback);
      }

      setProgress(100);
      setTimeout(() => setPhase('welcome'), 600);
      return;
    }

    setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleFinish = () => {
    setOnboardingDone(true);
    navigate('/', { replace: true });
  };

  // PHASE: LOADING
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex justify-center">
            <AppLogo size={56} />
          </div>
          <div className="space-y-4">
            <p className="text-lg font-medium text-foreground transition-opacity duration-300">
              {loadingText}
            </p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            La IA está analizando tu perfil para personalizar tu experiencia
          </p>
        </div>
      </div>
    );
  }

  // PHASE: WELCOME
  if (phase === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center gap-3 items-center">
            <AppLogo size={48} />
            <CheckCircle className="text-primary" size={28} />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold text-foreground">
              ¡Hola, {userName}!
            </h1>
            <p className="text-muted-foreground">Tu espacio está listo.</p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="text-primary mt-1 shrink-0" size={20} />
              <p className="text-foreground leading-relaxed whitespace-pre-line">
                {welcomeMessage}
              </p>
            </div>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full h-14 rounded-2xl text-base font-medium"
          >
            Empezar mi día
            <ArrowRight className="ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // PHASE: STEPS
  const OPTIONS_MAP: Record<number, typeof USER_TYPES> = {
    2: USER_TYPES,
    3: AREAS,
    4: OBSTACLES,
    5: GOALS,
  };

  const SELECTED_MAP: Record<number, string> = {
    2: selectedUserType,
    3: selectedArea,
    4: selectedObstacle,
    5: selectedGoal,
  };

  const SET_MAP: Record<number, (v: string) => void> = {
    2: setSelectedUserType,
    3: setSelectedArea,
    4: setSelectedObstacle,
    5: setSelectedGoal,
  };

  const TITLES: Record<number, string> = {
    1: '¿Cómo te gusta que te llamen?',
    2: '¿Cómo describirías tu situación actual?',
    3: '¿Qué área genera más caos en tu día?',
    4: '¿Cuál es tu mayor enemigo del foco?',
    5: '¿Qué quieres lograr con Focus On?',
  };

  const SUBTITLES: Record<number, string> = {
    1: 'Así personalizamos tu experiencia.',
    2: 'Selecciona la que más te identifique.',
    3: 'Sé honesto, Focus On se adapta a ti.',
    4: 'Tu obstáculo real, no el que crees que deberías tener.',
    5: 'Tu meta define cómo la IA te guía.',
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      {/* Progress bar */}
      <div className="w-full max-w-md mx-auto mb-8 space-y-2">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Paso {step} de 5
        </p>
      </div>

      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            {step === 1 && (
              <div className="flex justify-center">
                <AppLogo size={48} />
              </div>
            )}
            <h1 className="text-2xl font-semibold text-foreground leading-tight">
              {TITLES[step]}
            </h1>
            <p className="text-sm text-muted-foreground">{SUBTITLES[step]}</p>
          </div>

          {/* Step 1: Name input */}
          {step === 1 && (
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Tu nombre o apodo..."
              className="text-center text-lg h-14 rounded-2xl"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            />
          )}

          {/* Steps 2-5: Option grid */}
          {step >= 2 && (
            <div className="grid grid-cols-2 gap-3">
              {OPTIONS_MAP[step].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => SET_MAP[step](opt.id)}
                  className={`p-5 text-center rounded-2xl border bg-card transition-all duration-200 active:scale-[0.97] flex flex-col items-center gap-1 ${
                    SELECTED_MAP[step] === opt.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="text-xs text-muted-foreground leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-6">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-14 rounded-2xl px-5"
            >
              <ArrowLeft />
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="flex-1 h-14 rounded-2xl text-base font-medium"
          >
            {step === 5 ? 'Comenzar' : 'Continuar'}
            <ArrowRight className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
