import { toMinutes } from '../shared/services/time.utils';

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
