import { Calendar, Check, Loader2 } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

export function GoogleCalendarConnect() {
  const { connection, loading, working, connect, disconnect } = useGoogleCalendar();

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 mb-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calendar size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Google Calendar</h3>
          {loading ? (
            <p className="text-xs text-muted-foreground mt-1">Cargando…</p>
          ) : connection ? (
            <>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Check size={12} className="text-primary" />
                Conectado{connection.google_email ? ` como ${connection.google_email}` : ''}
              </p>
              <button
                onClick={disconnect}
                disabled={working}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {working ? 'Desconectando…' : 'Desconectar'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                Sincroniza tus bloques con tu calendario personal.
              </p>
              <button
                onClick={connect}
                disabled={working}
                className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                {working && <Loader2 size={12} className="animate-spin" />}
                Conectar Google Calendar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
