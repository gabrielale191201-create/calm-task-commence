import { useMemo } from 'react';
import { Task } from '@/types/focuson';
import { TimeBlock } from './TimeBlock';
import { toISODate, startOfWeekMonday, parseTimeToMinutes, parseDateString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface SchoolScheduleGridProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function SchoolScheduleGrid({ tasks, onTaskClick }: SchoolScheduleGridProps) {
  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return toISODate(d);
    });
  }, [weekStart]);

  const todayISO = toISODate(new Date());

  // Only scheduled tasks with date + time + duration
  const scheduledTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.scheduledDate && t.scheduledTime && t.durationMinutes
    );
  }, [tasks]);

  // Build a map: day -> hour -> task
  const grid = useMemo(() => {
    const map = new Map<string, Map<number, Task>>();
    for (const day of weekDays) {
      map.set(day, new Map());
    }
    for (const task of scheduledTasks) {
      if (!weekDays.includes(task.scheduledDate!)) continue;
      const startMinutes = parseTimeToMinutes(task.scheduledTime!);
      const startHour = Math.floor(startMinutes / 60);
      if (startHour >= 7 && startHour <= 20) {
        map.get(task.scheduledDate!)!.set(startHour, task);
      }
    }
    return map;
  }, [weekDays, scheduledTasks]);

  // Calculate row span based on duration
  const getRowSpan = (task: Task) => {
    const hours = Math.ceil((task.durationMinutes || 60) / 60);
    return Math.min(hours, 4); // max 4 hours span
  };

  // Track which cells are "occupied" by spanning blocks
  const occupiedCells = useMemo(() => {
    const occupied = new Set<string>();
    for (const [day, hourMap] of grid.entries()) {
      for (const [hour, task] of hourMap.entries()) {
        const span = getRowSpan(task);
        for (let i = 0; i < span; i++) {
          occupied.add(`${day}-${hour + i}`);
        }
      }
    }
    return occupied;
  }, [grid]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Header row */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="text-xs text-muted-foreground text-center py-2">Hora</div>
          {weekDays.map((day, i) => {
            const isToday = day === todayISO;
            const d = parseDateString(day);
            return (
              <div
                key={day}
                className={cn(
                  'text-center py-2 rounded-lg',
                  isToday && 'bg-primary/10'
                )}
              >
                <p className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {DAY_LABELS[i]}
                </p>
                <p className={cn('text-sm font-semibold', isToday ? 'text-primary' : 'text-foreground')}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-px bg-border/30">
              {/* Hour label */}
              <div className="bg-card px-2 py-3 text-right">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>

              {/* Day cells */}
              {weekDays.map((day) => {
                const cellKey = `${day}-${hour}`;
                const task = grid.get(day)?.get(hour);
                const isOccupied = occupiedCells.has(cellKey) && !task;
                const isToday = day === todayISO;

                if (isOccupied) {
                  // Cell is part of a spanning block, skip rendering
                  return null;
                }

                return (
                  <div
                    key={cellKey}
                    className={cn(
                      'bg-card min-h-[3.5rem] p-1',
                      isToday && 'bg-primary/5'
                    )}
                  >
                    {task ? (
                      <TimeBlock
                        task={task}
                        rowSpan={getRowSpan(task)}
                        onClick={() => onTaskClick?.(task)}
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-muted/20" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
