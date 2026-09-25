import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentDto } from '../dto/appointment.dto';
import { GoogleCalendarService } from '../google-calendar/googleCalendar.service';
import { AuthUser } from '../auth/auth-user.interface';
import { mondayBasedDayIndex, nowInBusinessTimezone, toMinutes, toTimeString } from '../common/time.utils';

const userPublicSelect = { id: true, email: true, name: true };

@Injectable()
export class AppointmentService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly googleCalendarService: GoogleCalendarService,
    ) { }

    private async getServiceOrFail(serviceId: string) {
        const service = await this.prismaService.service.findUnique({ where: { id: serviceId } });
        if (!service) throw new BadRequestException('El servicio seleccionado no existe');
        return service;
    }

    private computeEndTime(startTime: string, duration: number): string {
        const end = toMinutes(startTime) + duration;
        if (end > 24 * 60) throw new BadRequestException('La cita no puede terminar después de medianoche');
        return toTimeString(end);
    }

    private assertNotInPast(date: string, startTime: string) {
        const now = nowInBusinessTimezone();
        if (date < now.date || (date === now.date && startTime <= now.time)) {
            throw new BadRequestException('No se pueden reservar citas en el pasado');
        }
    }

    private async assertWithinBusinessHours(date: string, startTime: string, endTime: string) {
        const dayHours = await this.prismaService.businessHours.findUnique({
            where: { dayOfWeek: mondayBasedDayIndex(date) },
            include: { timeBlocks: true },
        });

        const fits = !!dayHours && !dayHours.isClosed && dayHours.timeBlocks.some(
            b => b.openTime <= startTime && endTime <= b.closeTime,
        );
        if (!fits) throw new BadRequestException('La hora seleccionada está fuera del horario del negocio');
    }

    private async assertNoOverlap(date: string, startTime: string, endTime: string, excludeId?: string) {
        const overlapping = await this.prismaService.appointment.findFirst({
            where: {
                date,
                startTime: { lt: endTime },
                endTime: { gt: startTime },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        if (overlapping) {
            throw new ConflictException(
                `Ese horario ya está ocupado (${overlapping.startTime} - ${overlapping.endTime}). Elige otra hora.`,
            );
        }
    }

    private calendarData(appointment: {
        date: string; startTime: string; endTime: string; clientName: string | null;
        user?: { name: string | null } | null; service: { title: string; price: number; duration: number };
    }) {
        return {
            summary: `${appointment.service.title} · ${appointment.clientName || appointment.user?.name || 'Cliente'}`,
            date: appointment.date,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            price: appointment.service.price,
            duration: appointment.service.duration,
            client: appointment.clientName || appointment.user?.name || 'Desconocido',
            service: appointment.service.title || 'Sin título',
        };
    }

    async createAppointment(dto: AppointmentDto, user: AuthUser) {
        const isAdmin = user.role === 'admin';
        const service = await this.getServiceOrFail(dto.serviceId);
        const endTime = this.computeEndTime(dto.startTime, service.duration);

        this.assertNotInPast(dto.date, dto.startTime);
        // El administrador puede crear citas fuera del horario (p. ej. huecos especiales).
        if (!isAdmin) await this.assertWithinBusinessHours(dto.date, dto.startTime, endTime);
        await this.assertNoOverlap(dto.date, dto.startTime, endTime);

        const appointment = await this.prismaService.appointment.create({
            data: {
                date: dto.date,
                startTime: dto.startTime,
                endTime,
                clientName: (isAdmin ? dto.clientName?.trim() : null) || user.name || null,
                user: { connect: { id: user.id } },
                service: { connect: { id: service.id } },
            },
            include: { user: { select: userPublicSelect }, service: true },
        });

        const googleEventId = await this.googleCalendarService.createEvent(this.calendarData(appointment));
        if (!googleEventId) return appointment;

        return this.prismaService.appointment.update({
            where: { id: appointment.id },
            data: { googleEventId },
            include: { user: { select: userPublicSelect }, service: true },
        });
    }

    async updateAppointment(id: string, dto: AppointmentDto) {
        const existing = await this.prismaService.appointment.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Cita no encontrada');

        const service = await this.getServiceOrFail(dto.serviceId);
        const endTime = this.computeEndTime(dto.startTime, service.duration);
        await this.assertNoOverlap(dto.date, dto.startTime, endTime, id);

        const appointment = await this.prismaService.appointment.update({
            where: { id },
            data: {
                date: dto.date,
                startTime: dto.startTime,
                endTime,
                serviceId: service.id,
                clientName: dto.clientName?.trim() || existing.clientName,
            },
            include: { service: true, user: { select: userPublicSelect } },
        });

        const googleEventId = await this.googleCalendarService.upsertEvent(
            appointment.googleEventId, this.calendarData(appointment),
        );
        if (googleEventId === appointment.googleEventId) return appointment;

        return this.prismaService.appointment.update({
            where: { id },
            data: { googleEventId },
            include: { service: true, user: { select: userPublicSelect } },
        });
    }

    async getAppointments() {
        return this.prismaService.appointment.findMany({
            include: { service: true, user: { select: userPublicSelect } },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
    }

    async getBusySlots(date: string) {
        return this.prismaService.appointment.findMany({
            where: { date },
            select: { startTime: true, endTime: true },
            orderBy: { startTime: 'asc' },
        });
    }

    async getUserAppointments(userId: string) {
        return this.prismaService.appointment.findMany({
            where: { userId },
            include: { service: true },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
    }

    async deleteAppointment(id: string, user: AuthUser) {
        if (!id) throw new BadRequestException('Falta el id de la cita');

        const appointment = await this.prismaService.appointment.findUnique({ where: { id } });
        if (!appointment) throw new NotFoundException('Cita no encontrada');

        if (user.role !== 'admin') {
            if (appointment.userId !== user.id) {
                throw new ForbiddenException('No puedes cancelar citas de otros usuarios');
            }
            const now = nowInBusinessTimezone();
            if (appointment.date < now.date || (appointment.date === now.date && appointment.startTime <= now.time)) {
                throw new BadRequestException('No se pueden cancelar citas pasadas');
            }
        }

        await this.googleCalendarService.deleteEvent(appointment.googleEventId);
        await this.prismaService.appointment.delete({ where: { id } });

        return { success: true, message: 'Cita eliminada correctamente' };
    }

    /**
     * Elimina las citas locales cuyo evento se borró en Google Calendar.
     * Solo se comparan citas dentro de la ventana consultada para no borrar citas antiguas.
     */
    async syncFromGoogle() {
        const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const googleEventIds = await this.googleCalendarService.listEventIds(timeMin);
        if (!googleEventIds) return { synced: false, removed: 0 };

        const fromDate = timeMin.toISOString().slice(0, 10);
        const localAppointments = await this.prismaService.appointment.findMany({
            where: { googleEventId: { not: null }, date: { gt: fromDate } },
            select: { id: true, googleEventId: true },
        });

        const toDelete = localAppointments
            .filter(appt => !googleEventIds.has(appt.googleEventId!))
            .map(appt => appt.id);

        if (toDelete.length) {
            await this.prismaService.appointment.deleteMany({ where: { id: { in: toDelete } } });
        }
        return { synced: true, removed: toDelete.length };
    }
}
