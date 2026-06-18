import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { toast } from 'sonner';

export default function CalendarCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuth } = useGoogleCalendar();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    const state = params.get('state') ?? '';
    const errParam = params.get('error');

    if (errParam) {
      setError(`Google rechazó la conexión: ${errParam}`);
      return;
    }
    if (!code) {
      setError('Falta el código de autorización.');
      return;
    }

    completeOAuth(code, state)
      .then(() => {
        toast.success('Google Calendar conectado');
        navigate('/app', { replace: true });
      })
      .catch((e) => setError(e.message ?? 'Error al completar la conexión'));
  }, [params, completeOAuth, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <h1 className="text-xl font-semibold text-foreground">No se pudo conectar</h1>
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        <button
          onClick={() => navigate('/app', { replace: true })}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm"
        >
          Volver
        </button>
      </div>
    );
  }

  return <LoadingScreen message="Conectando con Google Calendar..." />;
}
