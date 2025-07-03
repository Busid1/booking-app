export function toMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr?.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}