import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthState } from '@/hooks/useAuthState';
import { toast } from 'sonner';

interface TaskReminderToggleV2Props {
  taskId: string;
  taskText: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

type ReminderState = {
  active: boolean;
  // datetime-local value: YYYY-MM-DDTHH:mm
  datetimeLocal: string;
};

const LS_KEY = 'focuson_task_reminders_v1';

function loadAll(): Record<string, ReminderState> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ReminderState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, ReminderState>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function getDefaultDatetimeLocal(scheduledDate?: string, scheduledTime?: string): string {
  if (scheduledDate && scheduledTime) return `${scheduledDate}T${scheduledTime}`;
  const defaultTime = new Date(Date.now() + 30 * 60 * 1000);
  return defaultTime.toISOString().slice(0, 16);
}

export function TaskReminderToggle({ taskId, taskText, scheduledDate, scheduledTime }: TaskReminderToggleV2Props) {
  const { authStatus, isAuthenticated } = useAuthState();
  const { isSupported, scheduleReminder, permission } = usePushNotifications();

  const storageKey = useMemo(() => `${taskId}`, [taskId]);

  const [enabled, setEnabled] = useState(false);
  const [datetimeLocal, setDatetimeLocal] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Hydrate state from localStorage
  useEffect(() => {
    const all = loadAll();
    const st = all[storageKey];
    if (st?.active) {
      setEnabled(true);
      setDatetimeLocal(st.datetimeLocal);
      setShowPicker(false);
    }
  }, [storageKey]);

  // Hide entire control if browser doesn't support push
  if (!isSupported) return null;

  const requiresAuth = authStatus !== 'authenticated';

  const persist = useCallback((next: ReminderState | null) => {
    const all = loadAll();
    if (!next) {
      delete all[storageKey];
    } else {
      all[storageKey] = next;
    }
    saveAll(all);
  }, [storageKey]);

  const requestPermissionIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }, []);

  const onToggle = useCallback(async (checked: boolean) => {
    if (!checked) {
      setEnabled(false);
      setShowPicker(false);
      setDatetimeLocal('');
      persist(null);
      return;
    }

    // Calm, explicit: reminders require an account
    if (requiresAuth || !isAuthenticated) {
      toast.info('Para usar recordatorios, inicia sesión cuando te venga bien.');
      return;
    }

    // Permission gating before enabling
    if (permission === 'denied' || Notification.permission === 'denied') {
      toast.error('Las notificaciones están bloqueadas. Actívalas en la configuración del navegador.');
      return;
    }

    const ok = await requestPermissionIfNeeded();
    if (!ok) {
      toast.info('Necesitas permitir notificaciones para usar recordatorios.');
      return;
    }

    setEnabled(true);
    setShowPicker(true);
    setDatetimeLocal((prev) => prev || getDefaultDatetimeLocal(scheduledDate, scheduledTime));
  }, [isAuthenticated, permission, requestPermissionIfNeeded, requiresAuth, scheduledDate, scheduledTime, persist]);

  const onSave = useCallback(async () => {
    if (!datetimeLocal) {
      toast.error('Selecciona fecha y hora para el recordatorio');
      return;
    }

    // Guard rails
    const runAt = new Date(datetimeLocal);
    if (Number.isNaN(runAt.getTime())) {
      toast.error('Fecha u hora inválida');
      return;
    }
    if (runAt <= new Date()) {
      toast.error('El recordatorio debe ser en el futuro');
      return;
    }

    // Final auth check (prevents generic error)
    if (!isAuthenticated) {
      toast.info('Para guardar recordatorios, inicia sesión.');
      return;
    }

    setIsSaving(true);
    try {
      const success = await scheduleReminder(taskId, taskText, runAt);
      if (!success) {
        // Only show an error when saving truly failed (auth/perm already validated)
        toast.error('No se pudo guardar el recordatorio. Intenta de nuevo.');
        return;
      }

      persist({ active: true, datetimeLocal });
      setShowPicker(false);
      toast.success('Recordatorio guardado');
    } finally {
      setIsSaving(false);
    }
  }, [datetimeLocal, isAuthenticated, persist, scheduleReminder, taskId, taskText]);

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {enabled ? <Bell size={14} className="text-primary" /> : <BellOff size={14} />}
          <span>Recordatorio</span>
          {enabled && !showPicker ? (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Activo</span>
          ) : null}
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={isSaving} />
      </div>

      {enabled && showPicker ? (
        <div className="mt-3 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              type="datetime-local"
              value={datetimeLocal}
              onChange={(e) => setDatetimeLocal(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <button
            onClick={onSave}
            disabled={isSaving || !datetimeLocal}
            className="w-full py-2.5 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Guardar recordatorio'}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Recibirás una notificación aunque la app esté cerrada
          </p>
        </div>
      ) : null}
    </div>
  );
}
