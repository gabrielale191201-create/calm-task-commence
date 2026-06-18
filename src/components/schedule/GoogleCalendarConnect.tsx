import { Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { cn } from '@/lib/utils';

export function GoogleCalendarConnect() {
  const { connection, loading, busy, connect, disconnect } = useGoogleCalendar();

  if (loading) {
    return (
      <div className="mb-4 p-4 rounded-2xl bg-muted/30 border border-border/40 flex items-center gap-3">
        <Loader2 className="animate-spin text-muted-foreground" size={18} />
        <span className="text-sm text-muted-foreground">Revisando conexión…</span>
      </div>
    );
  }

  const isConnected = !!connection;

  return (
    <div
      className={cn(
        'mb-4 p-4 rounded-2xl border animate-slide-up',
        isConnected
          ? 'bg-primary/5 border-primary/30'
          : 'bg-muted/30 border-border/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            isConnected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {isConnected ? <CheckCircle2 size={20} /> : <Calendar size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          {isConnected ? (
            <>
              <p className="text-sm font-medium text-foreground">Google Calendar conectado</p>
              {connection?.google_email && (
                <p className="text-xs text-muted-foreground truncate">{connection.google_email}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Tus tareas con fecha y hora podrán enviarse a tu calendario.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Conecta tu Google Calendar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Recibe los recordatorios de tus tareas directamente en Google.
              </p>
            </>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={isConnected ? disconnect : connect}
            className={cn(
              'mt-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50',
              isConnected
                ? 'bg-muted text-foreground hover:bg-muted/70'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} />
                Procesando…
              </span>
            ) : isConnected ? (
              'Desconectar'
            ) : (
              'Conectar Google Calendar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
