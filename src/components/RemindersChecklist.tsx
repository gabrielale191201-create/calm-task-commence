import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { Bell, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reminder {
  id: string;
  task_text: string;
  run_at: string;
  sent: boolean;
  is_completed: boolean;
}

export function RemindersChecklist() {
  const { isAuthenticated } = useAuthState();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!isAuthenticated) return;
    const { data } = await supabase
      .from('reminders')
      .select('id, task_text, run_at, sent, is_completed')
      .order('run_at', { ascending: true });
    if (data) setReminders(data as unknown as Reminder[]);
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const toggleCompleted = async (id: string, current: boolean) => {
    setReminders(prev =>
      prev.map(r => r.id === id ? { ...r, is_completed: !current } : r)
    );
    await supabase
      .from('reminders')
      .update({ is_completed: !current } as any)
      .eq('id', id);
  };

  if (!isAuthenticated) return null;
  if (loading) return (
    <div className="text-xs text-muted-foreground text-center py-3">Cargando recordatorios...</div>
  );
  if (reminders.length === 0) return (
    <div className="text-xs text-muted-foreground text-center py-3">No tienes recordatorios activos.</div>
  );

  return (
    <div className="space-y-2">
      {reminders.map((r) => (
        <div
          key={r.id}
          onClick={() => toggleCompleted(r.id, r.is_completed)}
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card/50 cursor-pointer',
            'transition-all duration-300 ease-in-out',
            r.is_completed && 'opacity-60'
          )}
        >
          {/* Circular check button */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleCompleted(r.id, r.is_completed); }}
            className={cn(
              'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5',
              'flex items-center justify-center',
              'transition-colors duration-300 ease-in-out',
              r.is_completed
                ? 'bg-green-500 border-green-500'
                : 'border-muted-foreground/40 hover:border-green-400'
            )}
            aria-label={r.is_completed ? 'Marcar como pendiente' : 'Marcar como completada'}
          >
            {r.is_completed && <Check size={12} className="text-white" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm transition-all duration-300 ease-in-out',
              r.is_completed
                ? 'line-through text-muted-foreground opacity-60 italic'
                : 'text-foreground'
            )}>
              {r.task_text}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(r.run_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>

          <Bell size={14} className={cn(
            'mt-1 shrink-0 transition-colors duration-300',
            r.sent ? 'text-primary/60' : 'text-muted-foreground/40'
          )} />
        </div>
      ))}
    </div>
  );
}
