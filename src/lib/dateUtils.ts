export function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeekSunday(date: Date) {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function formatFullDateEs(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatWeekRangeEs(anchorDate: Date) {
  const start = startOfWeekMonday(anchorDate);
  const end = endOfWeekSunday(anchorDate);
  const startLabel = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const endLabel = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  return `${startLabel} – ${endLabel}`;
}

export function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
