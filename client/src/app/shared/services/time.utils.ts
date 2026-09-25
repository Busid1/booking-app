export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function toMinutes(timeStr: string): number {
  const [hours, minutes] = (timeStr ?? '0:0').split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function addMinutes(time: string, minutes: number): string {
  return toTimeString(toMinutes(time) + minutes);
}

/** Fecha local en formato YYYY-MM-DD (sin desfases por UTC). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convierte YYYY-MM-DD a Date local a medianoche. `new Date('YYYY-MM-DD')` usaría UTC. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function nowTime(): string {
  const now = new Date();
  return toTimeString(now.getHours() * 60 + now.getMinutes());
}

/** Índice del día con lunes = 0 ... domingo = 6. */
export function mondayBasedDay(date: Date | string): number {
  const d = typeof date === 'string' ? fromDateKey(date) : date;
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isPast(date: string, time: string): boolean {
  const today = todayKey();
  return date < today || (date === today && time <= nowTime());
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
