import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useProfile } from '@/hooks/useProfile';
import { trackUserEvent } from '@/lib/trackEvent';
import { supabase } from '@/integrations/supabase/client';
import { AppLogo } from '@/components/AppLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

const USER_TYPES = [
  { id: 'profesional', label: 'Profesional / Trabajador', emoji: '💼', desc: 'Trabajo en empresa o institución' },
  { id: 'emprendedor', label: 'Emprendedor / Freelance', emoji: '🚀', desc: 'Tengo mi propio negocio o proyecto' },
  { id: 'estudiante', label: 'Estudiante', emoji: '📚', desc: 'Estudio y quiero rendir mejor' },
  { id: 'personal', label: 'Crecimiento Personal', emoji: '🧘', desc: 'Quiero organizarme mejor en mi vida' },
];

const AREAS = [
  { id: 'emprendimiento', label: 'Emprendimiento', emoji: '🚀', desc: 'Mi negocio o proyecto propio' },
  { id: 'estudios', label: 'Estudios', emoji: '📚', desc: 'Carrera, exámenes, aprendizaje' },
  { id: 'trabajo', label: 'Trabajo Corporativo', emoji: '💼', desc: 'Reuniones, deadlines, equipo' },
  { id: 'personal', label: 'Vida Personal', emoji: '🧘', desc: 'Familia, salud, hábitos' },
];

const OBSTACLES = [
  { id: 'procrastinacion', label: 'Procrastinación', emoji: '⏳', desc: 'Lo dejo todo para después' },
  { id: 'tiempo', label: 'Falta de Tiempo', emoji: '⚡', desc: 'El día no me alcanza' },
  { id: 'ideas', label: 'Exceso de ideas', emoji: '💡', desc: 'Mi mente no para' },
  { id: 'cansancio', label: 'Cansancio', emoji: '😴', desc: 'No tengo energía mental' },
];

const GOALS = [
  { id: 'terminar_tareas', label: 'Terminar lo que empiezo', emoji: '✅', desc: 'Ejecutar sin dejarlas a medias' },
  { id: 'reducir_ansiedad', label: 'Reducir la ansiedad mental', emoji: '🧠', desc: 'Ordenar el caos en mi cabeza' },
  { id: 'ser_mas_productivo', label: 'Ser más productivo', emoji: '⚡', desc: 'Hacer más en menos tiempo' },
  { id: 'construir_habitos', label: 'Construir hábitos reales', emoji: '📈', desc: 'Consistencia día a día' },
];

const LOADING_TEXTS = [
  'Entendiendo tu contexto...',
  'Configurando tu espacio...',
  'Preparando tu primer día...',
];

const FALLBACKS: Record<string, (name: string) => string> = {
  profesional: (n) => `Hola ${n}. Sé lo que es tener el día lleno y la mente saturada. Empieza hoy con una sola tarea: abre Focus On y escribe todo lo que tienes pendiente. La IA lo organizará por ti.`,
  emprendedor: (n) => `Hola ${n}. Los emprendedores tienen mil ideas y poco tiempo. Hoy, escribe tus 3 tareas más importantes en Focus On y enfócate solo en esas. El resto puede esperar.`,
  estudiante: (n) => `Hola ${n}. Estudiar con el cerebro saturado no funciona. Empieza por escribir todas tus pendientes en Focus On — la IA las ordena y tú ejecutas una a la vez.`,
  personal: (n) => `Hola ${n}. El primer paso es simple: escribe todo lo que tienes en mente ahora mismo en Focus On. La claridad llega sola cuando sacas el caos de tu cabeza.`,
};

const TOTAL_STEPS = 5;

type Phase = 'steps' | 'loading' | 'welcome';

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const [phase, setPhase] = useState<Phase>('steps');
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useLocalStorage<string>('focuson-user-name', '');
  const [, setOnboardingDone] = useLocalStorage<boolean>('focuson-onboarding-done', false);
  const [selectedUserType, setSelectedUserType] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedObstacle, setSelectedObstacle] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // Animación de carga + llamada a IA
  useEffect(() => {
    if (phase !== 'loading') return;

    const startedAt = Date.now();
    const minDuration = 3000;

    // Progreso visual
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(95, (elapsed / minDuration) * 100);
      setLoadingProgress(pct);
    }, 80);

    // Texto cambiante
    const textInterval = setInterval(() => {
      setLoadingTextIndex((i) => (i + 1) % LOADING_TEXTS.length);
    }, 1100);

    // Llamada a la edge function
    const aiPromise = supabase.functions.invoke('onboarding-welcome', {
      body: {
        name: userName.trim(),
        userType: selectedUserType,
        area: selectedArea,
        obstacle: selectedObstacle,
        goal: selectedGoal,
      },
    }).then(({ data, error }) => {
      if (error || !data?.message) {
        const fb = FALLBACKS[selectedUserType] || FALLBACKS.personal;
        return fb(userName.trim() || 'campeón');
      }
      return data.message as string;
    }).catch(() => {
      const fb = FALLBACKS[selectedUserType] || FALLBACKS.personal;
      return fb(userName.trim() || 'campeón');
    });

    // Esperar al menos minDuration y a la IA
    Promise.all([
      aiPromise,
      new Promise((r) => setTimeout(r, minDuration)),
    ]).then(([msg]) => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
      setLoadingProgress(100);
      const finalMsg = msg as string;
      setWelcomeMessage(finalMsg);
      try { localStorage.setItem('focuson-welcome-message', finalMsg); } catch {}
      setTimeout(() => setPhase('welcome'), 250);
    });

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
  }, [phase, userName, selectedUserType, selectedArea, selectedObstacle, selectedGoal]);

  const canAdvance = () => {
    if (step === 1) return userName.trim().length > 0;
    if (step === 2) return !!selectedUserType;
    if (step === 3) return !!selectedArea;
    if (step === 4) return !!selectedObstacle;
    if (step === 5) return !!selectedGoal;
    return false;
  };

  const handleNext = () => {
    if (!canAdvance()) return;

    if (step === 1) trackUserEvent('onboarding_step_name', { name: userName.trim() });
    if (step === 2) trackUserEvent('onboarding_step_user_type', { userType: selectedUserType });
    if (step === 3) trackUserEvent('onboarding_step_area', { area: selectedArea });
    if (step === 4) trackUserEvent('onboarding_step_obstacle', { obstacle: selectedObstacle });

    if (step === 5) {
      // Completar onboarding
      updateProfile({
        name: userName.trim(),
        userType: selectedUserType,
        area: selectedArea,
        obstacle: selectedObstacle,
        goal: selectedGoal,
      });
      trackUserEvent('onboarding_completed', {
        name: userName.trim(),
        userType: selectedUserType,
        area: selectedArea,
        obstacle: selectedObstacle,
        goal: selectedGoal,
      });
      setPhase('loading');
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    setOnboardingDone(true);
    navigate('/', { replace: true });
  };

  // ───────── Pantalla de carga con IA ─────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="animate-pulse mb-8">
          <AppLogo size={72} />
        </div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-3 text-center">
          La IA está analizando tu perfil...
        </h2>
        <p className="text-sm text-primary mb-8 h-5 transition-opacity duration-300">
          {LOADING_TEXTS[loadingTextIndex]}
        </p>
        <div className="w-full max-w-xs">
          <Progress value={loadingProgress} className="h-2" />
        </div>
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles size={12} className="text-primary" />
          <span>Personalizando con IA</span>
        </div>
      </div>
    );
  }

  // ───────── Pantalla de bienvenida final ─────────
  if (phase === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 animate-fade-in">
        <div className="w-full max-w-md flex flex-col items-center">
          <AppLogo size={64} className="mb-6" />
          <h1 className="text-3xl font-display font-semibold text-foreground mb-6 text-center">
            ¡Hola, {userName.trim() || 'campeón'}!
          </h1>

          <div
            className="w-full rounded-2xl p-6 mb-8 border border-primary/20"
            style={{ background: 'hsl(var(--primary) / 0.08)' }}
          >
            <p className="text-base leading-relaxed text-foreground font-display text-center">
              {welcomeMessage}
            </p>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full h-14 text-base rounded-2xl gap-2 btn-primary-focus"
          >
            Empezar mi día
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    );
  }

  // ───────── Pasos del onboarding ─────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="flex gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
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
          <div key="s1" className="w-full max-w-md space-y-8 animate-fade-in">
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

        {/* Step 2: Tipo de usuario */}
        {step === 2 && (
          <div key="s2" className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                ¿Cómo describirías mejor tu situación actual?
              </h1>
              <p className="text-sm text-muted-foreground">
                Elige la que más se acerque a ti.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {USER_TYPES.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedUserType(opt.id)}
                  className={`focus-card p-5 text-center transition-all duration-200 active:scale-[0.97] flex flex-col items-center ${
                    selectedUserType === opt.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{opt.emoji}</span>
                  <span className="text-sm font-medium text-foreground leading-tight">{opt.label}</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Área */}
        {step === 3 && (
          <div key="s3" className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                ¿Qué área genera más caos en tu día?
              </h1>
              <p className="text-sm text-muted-foreground">
                Selecciona la que más te identifique.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {AREAS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedArea(opt.id)}
                  className={`focus-card p-5 text-center transition-all duration-200 active:scale-[0.97] flex flex-col items-center ${
                    selectedArea === opt.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{opt.emoji}</span>
                  <span className="text-sm font-medium text-foreground leading-tight">{opt.label}</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Obstáculo */}
        {step === 4 && (
          <div key="s4" className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                ¿Cuál es tu mayor enemigo del foco?
              </h1>
              <p className="text-sm text-muted-foreground">
                Sé honesto. Focus On se adapta a ti.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {OBSTACLES.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedObstacle(opt.id)}
                  className={`focus-card p-5 text-center transition-all duration-200 active:scale-[0.97] flex flex-col items-center ${
                    selectedObstacle === opt.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{opt.emoji}</span>
                  <span className="text-sm font-medium text-foreground leading-tight">{opt.label}</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Meta */}
        {step === 5 && (
          <div key="s5" className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                ¿Qué quieres lograr con Focus On?
              </h1>
              <p className="text-sm text-muted-foreground">
                Tu meta principal nos ayuda a guiarte.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedGoal(opt.id)}
                  className={`focus-card p-5 text-center transition-all duration-200 active:scale-[0.97] flex flex-col items-center ${
                    selectedGoal === opt.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{opt.emoji}</span>
                  <span className="text-sm font-medium text-foreground leading-tight">{opt.label}</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="w-full max-w-md mt-10 space-y-3">
          <Button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="w-full h-14 text-base rounded-2xl gap-2 btn-primary-focus"
          >
            {step === TOTAL_STEPS ? 'Comenzar' : 'Continuar'}
            <ArrowRight size={18} />
          </Button>

          {step > 1 && (
            <Button
              onClick={handleBack}
              variant="ghost"
              className="w-full h-11 text-sm rounded-2xl gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} />
              Atrás
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
