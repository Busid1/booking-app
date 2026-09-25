import { BusySlot } from '../shared/interfaces/appointment.interface';
import { BusinessHoursInterface } from '../shared/interfaces/business-hours.interface';
import { nowTime, toMinutes, toTimeString, todayKey } from '../shared/services/time.utils';

/**
 * Calcula las horas de inicio disponibles para un día.
 * - Los huecos avanzan cada `min(duración, 30)` minutos dentro de cada tramo del horario.
 * - Se descartan los que se solapan con otra cita (cualquier servicio) o que ya han pasado.
 */
export function computeAvailableSlots(
  date: string,
  day: BusinessHoursInterface | undefined,
  duration: number,
  busy: BusySlot[],
): string[] {
  if (!day || day.isClosed || duration <= 0) return [];

  const step = Math.min(duration, 30);
  const busyRanges = busy.map(b => [toMinutes(b.startTime), toMinutes(b.endTime)] as const);
  const minStart = date === todayKey() ? toMinutes(nowTime()) + 1 : -1;
  const slots = new Set<number>();

  for (const block of day.timeBlocks) {
    const open = toMinutes(block.openTime);
    const close = toMinutes(block.closeTime);
    for (let start = open; start + duration <= close; start += step) {
      const end = start + duration;
      if (start < minStart) continue;
      if (busyRanges.some(([bStart, bEnd]) => start < bEnd && bStart < end)) continue;
      slots.add(start);
    }
  }

  return [...slots].sort((a, b) => a - b).map(toTimeString);
}

export type SlotPeriod = 'Mañana' | 'Tarde' | 'Noche';

export function groupSlotsByPeriod(slots: string[]): { period: SlotPeriod; icon: string; slots: string[] }[] {
  const groups: { period: SlotPeriod; icon: string; slots: string[] }[] = [
    { period: 'Mañana', icon: 'fa-sun', slots: [] },
    { period: 'Tarde', icon: 'fa-cloud-sun', slots: [] },
    { period: 'Noche', icon: 'fa-moon', slots: [] },
  ];
  for (const slot of slots) {
    const minutes = toMinutes(slot);
    groups[minutes < 12 * 60 ? 0 : minutes < 20 * 60 ? 1 : 2].slots.push(slot);
  }
  return groups.filter(g => g.slots.length);
}
