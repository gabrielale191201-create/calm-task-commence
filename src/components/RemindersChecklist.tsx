import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell } from 'lucide-react';
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
    // Optimistic update
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
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card/50 transition-all duration-300',
            r.is_completed && 'opacity-50'
          )}
        >
          <Checkbox
            checked={r.is_completed}
            onCheckedChange={() => toggleCompleted(r.id, r.is_completed)}
            className="mt-0.5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm text-foreground transition-all duration-300',
              r.is_completed && 'line-through text-muted-foreground'
            )}>
              {r.task_text}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(r.run_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
          <Bell size={14} className={cn(
            'mt-1 shrink-0',
            r.sent ? 'text-primary/60' : 'text-muted-foreground/40'
          )} />
        </div>
      ))}
    </div>
  );
}
