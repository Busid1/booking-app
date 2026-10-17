import { Injectable } from '@nestjs/common';
import { Prisma, Staff } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mondayBasedDayIndex, nowInBusinessTimezone, toMinutes, toTimeString } from '../common/time.utils';

export interface Block {
  openTime: string;
  closeTime: string;
}

export interface DaySchedule {
  dayOfWeek: number;
  isClosed: boolean;
  timeBlocks: Block[];
}

/** Minutos que una reserva pendiente de pago bloquea su hueco. */
export const PENDING_HOLD_MINUTES = 35;

export type StaffWithHours = Staff & { hours: { dayOfWeek: number; isClosed: boolean; timeBlocks: Prisma.JsonValue }[] };

/**
 * Lógica de agenda compartida: horarios efectivos (negocio o trabajador), citas que ocupan
 * hueco y cálculo de horas libres. Con trabajadores, cada uno tiene su propia agenda; sin
 * trabajadores, el negocio funciona como una única agenda (comportamiento original).
 */
@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  private parseBlocks(value: Prisma.JsonValue): Block[] {
    if (!Array.isArray(value)) return [];
    return (value as any[])
      .filter(b => b && typeof b.openTime === 'string' && typeof b.closeTime === 'string')
      .map(b => ({ openTime: b.openTime, closeTime: b.closeTime }))
      .sort((a, b) => a.openTime.localeCompare(b.openTime));
  }

  /** Horario semanal del negocio (7 días, lunes = 0). */
  async businessWeek(): Promise<DaySchedule[]> {
    const rows = await this.prisma.businessHours.findMany({ include: { timeBlocks: true } });
    return Array.from({ length: 7 }, (_, day) => {
      const row = rows.find(r => r.dayOfWeek === day);
      const blocks = (row?.timeBlocks ?? [])
        .map(b => ({ openTime: b.openTime, closeTime: b.closeTime }))
        .sort((a, b) => a.openTime.localeCompare(b.openTime));
      return { dayOfWeek: day, isClosed: !row || row.isClosed || !blocks.length, timeBlocks: row?.isClosed ? [] : blocks };
    });
  }

  /** Horario semanal efectivo de un trabajador. */
  staffWeek(staff: StaffWithHours, businessWeek: DaySchedule[]): DaySchedule[] {
    if (staff.useBusinessHours) return businessWeek;
    return Array.from({ length: 7 }, (_, day) => {
      const row = staff.hours.find(h => h.dayOfWeek === day);
      const blocks = row && !row.isClosed ? this.parseBlocks(row.timeBlocks) : [];
      return { dayOfWeek: day, isClosed: !blocks.length, timeBlocks: blocks };
    });
  }

  async hasActiveStaff(): Promise<boolean> {
    return (await this.prisma.staff.count({ where: { active: true } })) > 0;
  }

  /**
   * Trabajadores activos que pueden realizar un servicio. Si el servicio no tiene a nadie
   * asignado, lo puede hacer cualquier trabajador activo.
   */
  async eligibleStaff(serviceId: string): Promise<StaffWithHours[]> {
    const all = await this.prisma.staff.findMany({
      where: { active: true },
      include: { hours: true, services: { select: { id: true } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const assigned = all.filter(s => s.services.some(sv => sv.id === serviceId));
    return (assigned.length ? assigned : all).map(({ services, ...staff }) => staff);
  }

  /** Borra reservas pendientes de pago cuyo plazo ha caducado. */
  async purgeExpiredPending(): Promise<void> {
    await this.prisma.appointment.deleteMany({
      where: { status: 'pending_payment', createdAt: { lt: new Date(Date.now() - PENDING_HOLD_MINUTES * 60_000) } },
    });
  }

  /** Citas que ocupan hueco en un día (confirmadas o pendientes de pago vigentes). */
  async activeAppointmentsOn(date: string, excludeId?: string) {
    return this.prisma.appointment.findMany({
      where: {
        date,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          { status: 'confirmed' },
          { status: 'pending_payment', createdAt: { gte: new Date(Date.now() - PENDING_HOLD_MINUTES * 60_000) } },
        ],
      },
      select: { id: true, startTime: true, endTime: true, staffId: true },
    });
  }

  /**
   * Rangos ocupados para un trabajador (o para el negocio si staffId es null).
   * Las citas antiguas sin trabajador asignado bloquean a todos los trabajadores.
   */
  busyFor(appointments: { startTime: string; endTime: string; staffId: string | null }[], staffId: string | null) {
    return appointments
      .filter(a => staffId === null || a.staffId === null || a.staffId === staffId)
      .map(a => [toMinutes(a.startTime), toMinutes(a.endTime)] as const);
  }

  fitsSchedule(day: DaySchedule, start: string, end: string): boolean {
    return !day.isClosed && day.timeBlocks.some(b => b.openTime <= start && end <= b.closeTime);
  }

  overlaps(busy: (readonly [number, number])[], start: string, end: string): boolean {
    const s = toMinutes(start);
    const e = toMinutes(end);
    return busy.some(([bs, be]) => s < be && bs < e);
  }

  /** Horas de inicio libres en un día para una agenda concreta. */
  freeSlots(date: string, day: DaySchedule, duration: number, busy: (readonly [number, number])[]): string[] {
    if (day.isClosed || duration <= 0) return [];
    const now = nowInBusinessTimezone();
    if (date < now.date) return [];
    const minStart = date === now.date ? toMinutes(now.time) + 1 : -1;
    const step = Math.min(duration, 30);
    const result = new Set<number>();

    for (const block of day.timeBlocks) {
      const open = toMinutes(block.openTime);
      const close = toMinutes(block.closeTime);
      for (let start = open; start + duration <= close; start += step) {
        const end = start + duration;
        if (start < minStart) continue;
        if (busy.some(([bs, be]) => start < be && bs < end)) continue;
        result.add(start);
      }
    }
    return [...result].sort((a, b) => a - b).map(toTimeString);
  }

  /**
   * Huecos libres para un servicio en una fecha.
   * - staffId concreto: agenda de ese trabajador.
   * - 'any' o sin indicar (con trabajadores): unión de las agendas de los trabajadores aptos.
   * - Sin trabajadores: agenda única del negocio.
   */
  async availableSlots(date: string, serviceId: string, duration: number, staffId?: string | null): Promise<string[]> {
    await this.purgeExpiredPending();
    const [businessWeek, appointments] = await Promise.all([this.businessWeek(), this.activeAppointmentsOn(date)]);
    const dayIndex = mondayBasedDayIndex(date);

    if (!(await this.hasActiveStaff())) {
      return this.freeSlots(date, businessWeek[dayIndex], duration, this.busyFor(appointments, null));
    }

    let candidates = await this.eligibleStaff(serviceId);
    if (staffId && staffId !== 'any') candidates = candidates.filter(s => s.id === staffId);

    const all = new Set<string>();
    for (const staff of candidates) {
      const day = this.staffWeek(staff, businessWeek)[dayIndex];
      this.freeSlots(date, day, duration, this.busyFor(appointments, staff.id)).forEach(s => all.add(s));
    }
    return [...all].sort();
  }
}
