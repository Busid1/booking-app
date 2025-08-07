export function toMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr?.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function calculateEndTime(start: Date | undefined, duration: number): string {
  if (!start || typeof duration !== 'number') return '';

  const end = new Date(start.getTime() + duration * 60000);

  return end.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
