import { useMemo, useState } from 'react';
import { Plus, CalendarDays } from 'lucide-react';
import { ScheduleActivity } from '@/types/focuson';
import { cn } from '@/lib/utils';
import { formatFullDateEs, parseTimeToMinutes, startOfWeekMonday, toISODate, formatWeekRangeEs } from '@/lib/dateUtils';

type View = 'hoy' | 'semana';

export interface SchedulePageProps {
  activities: ScheduleActivity[];
  onRequestCreate: () => void;
  onStartFocusFromActivity: (activity: ScheduleActivity) => void;
}

function statusLabel(status: ScheduleActivity['status']) {
  if (status === 'done') return 'Hecha';
  if (status === 'incomplete') return 'Incompleta';
  return '';
}

export function SchedulePage({ activities, onRequestCreate, onStartFocusFromActivity }: SchedulePageProps) {
  const [view, setView] = useState<View>('hoy');
  const todayISO = toISODate(new Date());

  const todayActivities = useMemo(() => {
    return activities
      .filter((a) => a.date === todayISO)
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activities, todayISO]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const weekBuckets = useMemo(() => {
    const map = new Map<string, ScheduleActivity[]>();
    for (const d of weekDays) map.set(toISODate(d), []);
    for (const a of activities) {
      if (map.has(a.date)) map.get(a.date)!.push(a);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(k, list);
    }
    return map;
  }, [activities, weekDays]);

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Horario</h1>
          <p className="text-muted-foreground text-sm">Un día claro. Una cosa a la vez.</p>
        </div>
        <button
          onClick={onRequestCreate}
          className="p-3 rounded-xl bg-primary text-white hover:shadow-focus transition-all"
          title="Programar actividad"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6 animate-slide-up">
        <button
          onClick={() => setView('hoy')}
          className={cn('px-4 py-2 rounded-xl text-sm transition-colors', view === 'hoy' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground')}
        >
          Hoy
        </button>
        <button
          onClick={() => setView('semana')}
          className={cn('px-4 py-2 rounded-xl text-sm transition-colors', view === 'semana' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground')}
        >
          Semana
        </button>
      </div>

      {view === 'hoy' ? (
        <section className="animate-slide-up stagger-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <CalendarDays size={18} />
            <span className="text-sm font-medium capitalize">{formatFullDateEs(todayISO)}</span>
          </div>

          <div className="focus-card">
            <div className="space-y-4">
              {hours.map((h) => {
                const hourStart = h * 60;
                const hourEnd = h * 60 + 59;
                const blockItems = todayActivities.filter((a) => {
                  const s = parseTimeToMinutes(a.startTime);
                  const e = parseTimeToMinutes(a.endTime);
                  return !(e < hourStart || s > hourEnd);
                });

                return (
                  <div key={h} className="flex gap-4">
                    <div className="w-12 text-right">
                      <span className="text-xs text-muted-foreground tabular-nums">{String(h).padStart(2, '0')}:00</span>
                    </div>
                    <div className="flex-1">
                      {blockItems.length === 0 ? (
                        <div className="h-10 rounded-xl bg-muted/30" />
                      ) : (
                        <div className="space-y-2">
                          {blockItems.map((a) => (
                            <div key={a.id} className="p-3 rounded-xl bg-muted/50">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {a.startTime}–{a.endTime} · {a.category}
                                    {a.status !== 'scheduled' ? ` · ${statusLabel(a.status)}` : ''}
                                  </p>
                                  {a.note ? (
                                    <p className="text-xs text-muted-foreground mt-2">{a.note}</p>
                                  ) : null}
                                </div>

                                {a.canStartFocus && a.status === 'scheduled' ? (
                                  <button
                                    onClick={() => onStartFocusFromActivity(a)}
                                    className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors flex-shrink-0"
                                  >
                                    Iniciar enfoque
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {todayActivities.length === 0 && (
            <div className="text-center py-10 animate-fade-in">
              <p className="text-muted-foreground">
                Hoy no tienes nada programado.<br />
                Si te sirve, agenda una cosa pequeña.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="animate-slide-up stagger-1">
          <div className="text-sm text-muted-foreground mb-4">
            Semana: <span className="font-medium text-foreground">{formatWeekRangeEs(new Date())}</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const iso = toISODate(d);
              const list = weekBuckets.get(iso) || [];
              const label = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
              const dayNum = d.getDate();

              return (
                <div key={iso} className="rounded-2xl border border-border/50 bg-card p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground capitalize">{label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{dayNum}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {list.slice(0, 2).map((a) => (
                      <div key={a.id} className="rounded-xl bg-muted/40 px-2 py-2">
                        <p className="text-[11px] text-foreground leading-snug line-clamp-2">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{a.startTime}</p>
                      </div>
                    ))}
                    {list.length === 0 ? (
                      <div className="h-10 rounded-xl bg-muted/20" />
                    ) : null}
                    {list.length > 2 ? (
                      <p className="text-[10px] text-muted-foreground">+{list.length - 2} más</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
