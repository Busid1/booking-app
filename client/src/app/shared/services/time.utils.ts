export function toMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr?.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function convertRangeToDates(dateStr: string, range: string): { start: Date; end: Date } {
  const [startStr, endStr] = range?.split(' - ');
  const [sh, sm] = startStr?.split(':').map(Number);
  const [eh, em] = endStr?.split(':').map(Number);  

  const start = new Date(dateStr);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(dateStr);
  end.setHours(eh, em, 0, 0);

  return { start, end };
}