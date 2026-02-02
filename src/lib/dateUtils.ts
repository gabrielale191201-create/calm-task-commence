/**
 * Formats a Date to YYYY-MM-DD string in LOCAL timezone.
 * IMPORTANT: Using getFullYear/getMonth/getDate to avoid UTC shift issues.
 */
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string to a Date in LOCAL timezone.
 * IMPORTANT: Splitting to avoid UTC interpretation by Date constructor.
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
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
  const date = parseDateString(dateStr);
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
