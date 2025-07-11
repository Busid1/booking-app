import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentDto } from 'src/dto/appointment.dto';
import { GoogleCalendarService } from 'src/google-calendar/googleCalendar.service';

@Injectable()
export class AppointmentService {
    constructor(private readonly prismaService: PrismaService,
        private readonly googleCalendarService: GoogleCalendarService,
    ) { }
    async createAppointment(dto: AppointmentDto, userId: string) {
        const { date, startTime, endTime, serviceId } = dto;

        if (!userId || typeof userId !== 'string') {
            throw new BadRequestException('User ID inválido');
        }

        const appointment = await this.prismaService.appointment.create({
            data: {
                date,
                startTime,
                endTime,
                user: {
                    connect: { id: userId },
                },
                service: {
                    connect: { id: serviceId },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                service: true,
            },
        });

        const startDateTime = `${appointment.date}T${appointment.startTime}`;
        const endDateTime = `${appointment.date}T${appointment.endTime}`;

        const googleEvent = await this.googleCalendarService.createEvent({
            summary: `Cita: ${appointment.service.title}`,
            description: `Cliente: ${appointment.user.name} (${appointment.user.email})`,
            startDateTime,
            endDateTime,
        });

        await this.prismaService.appointment.update({
            where: { id: appointment.id },
            data: { googleEventId: googleEvent.id },
        });

        return appointment;
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


    async updateGoogleEventId(appointmentId: string, googleEventId: string) {
        return this.prismaService.appointment.update({
            where: { id: appointmentId },
            data: { googleEventId },
        });
    }

    async syncFromGoogleCalendar() {
        const events = await this.googleCalendarService.listEvents();

        for (const event of events) {
            const existing = await this.prismaService.appointment.findFirst({
                where: { googleEventId: event.id },
            });

            const startDate = event.start?.dateTime || event.start?.date;
            const endDate = event.end?.dateTime || event.end?.date;

            if (!startDate || !endDate) continue;

            const [date, startTime] = startDate.split('T');
            const [, endTime] = endDate.split('T');

            if (!existing) {
                // Crear en BD
                await this.prismaService.appointment.create({
                    data: {
                        date,
                        startTime: startTime?.slice(0, 5) || '00:00',
                        endTime: endTime?.slice(0, 5) || '00:00',
                        googleEventId: event.id,
                        service: {
                            connectOrCreate: {
                                where: { id: event.id }, // Use a unique identifier for the service
                                create: { id: event.id, title: event.summary || 'Sin título', price: 0, duration: 0 },
                            },
                        },
                        user: {
                            connectOrCreate: {
                                where: { email: 'unknown@example.com' }, // o intenta parsear del description
                                create: { name: 'Unknown', email: 'unknown@example.com', password: 'changeme' },
                            },
                        },
                    },
                });
            } else {
                // Actualizar si cambió algo
                await this.prismaService.appointment.update({
                    where: { id: existing.id },
                    data: {
                        date,
                        startTime: startTime?.slice(0, 5) || '00:00',
                        endTime: endTime?.slice(0, 5) || '00:00',
                    },
                });
            }
        }

        return { message: 'Sincronización completada', count: events.length };
    }


}