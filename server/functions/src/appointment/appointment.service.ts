import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentDto } from '../dto/appointment.dto';
import { GoogleCalendarService } from '../google-calendar/googleCalendar.service';

@Injectable()
export class AppointmentService {
    constructor(private readonly prismaService: PrismaService,
        private readonly googleCalendarService: GoogleCalendarService,
    ) { }
    async createAppointment(dto: AppointmentDto, userId: string) {
        const { date, startTime, endTime, serviceId, clientName } = dto;

        if (!userId || typeof userId !== 'string') {
            throw new BadRequestException('User ID inválido');
        }

        const appointment = await this.prismaService.appointment.create({
            data: {
                date,
                startTime,
                endTime,
                clientName,
                user: {
                    connect: { id: userId },
                },
                service: {
                    connect: { id: serviceId },
                },
            },
            include: {
                user: { select: { id: true, email: true, name: true } },
                service: true,
            },
        });

        const startDateTime = `${appointment.date}T${appointment.startTime}`;
        const endDateTime = `${appointment.date}T${appointment.endTime}`;

        const clientDisplayName = appointment.clientName || appointment.user?.name || 'Desconocido';

        await this.googleCalendarService.createEvent({
            summary: 'Cita con cliente',
            startDateTime,
            endDateTime,
            price: appointment.service.price,
            duration: appointment.service.duration,
            client: clientDisplayName,
            service: appointment.service.title || 'Sin título',
        });

        return appointment;
    }

    async updateAppointment(id: string, dto: AppointmentDto) {
        const { date, startTime, endTime, serviceId, clientName } = dto;

        try {
            const appointment = await this.prismaService.appointment.update({
                where: { id },
                data: {
                    date,
                    startTime,
                    endTime,
                    serviceId,
                    clientName,
                },
                include: {
                    service: true,
                    user: true,
                },
            });

            const startDateTime = `${appointment.date}T${appointment.startTime}`;
            const endDateTime = `${appointment.date}T${appointment.endTime}`;
            const clientDisplayName = appointment.clientName || appointment.user?.name || 'Desconocido';

            await this.googleCalendarService.updateEvent({
                eventId: appointment.googleEventId || '',
                summary: 'Cita con cliente',
                startDateTime,
                endDateTime,
                price: appointment.service.price,
                duration: appointment.service.duration,
                client: clientDisplayName,
                service: appointment.service.title || 'Sin título',
            });

            return appointment;
        } catch (error) {
            throw new BadRequestException('Error updating appointment');
        }
    }


    async getAppointments() {
        return this.prismaService.appointment.findMany({
            include: {
                service: true,
                user: true
            }
        })
    }

    async getUserAppointments(userId: string) {
        return this.prismaService.appointment.findMany({
            where: { userId },
            include: {
                service: true,
            }
        })
    }

    async deleteAppointment(id: string) {
        try {
            const appointment = await this.prismaService.appointment.findUnique({
                where: { id },
                select: { googleEventId: true },
            });

            if (!appointment) {
                throw new BadRequestException('Cita no encontrada');
            }

            if (appointment.googleEventId) {
                await this.googleCalendarService.deleteEvent(
                    appointment.googleEventId,
                    'primexd214@gmail.com'
                );
            }

            await this.prismaService.appointment.delete({
                where: { id },
            });

            return { success: true, message: 'Cita eliminada correctamente' };
        } catch (error) {
            console.error(error);
            throw new BadRequestException('Error eliminando la cita');
        }
    }

    async syncFromGoogle() {
        const googleEvents = await this.googleCalendarService.listEvents();
        const googleEventIds = googleEvents.map(ev => ev.id);

        const localAppointments = await this.prismaService.appointment.findMany({
            where: { googleEventId: { not: null } },
            select: { id: true, googleEventId: true }
        });

        const toDelete = localAppointments.filter(
            appt => !googleEventIds.includes(appt.googleEventId)
        );

        for (const appt of toDelete) {
            await this.prismaService.appointment.delete({ where: { id: appt.id } });
        }
    }
}