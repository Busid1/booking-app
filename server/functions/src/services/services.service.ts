import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceDto } from '../dto/service.dto';
import { GoogleCalendarService } from '../google-calendar/googleCalendar.service';

@Injectable()
export class ServicesService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly googleCalendarService: GoogleCalendarService,
    ) { }

    async createService(serviceDto: ServiceDto) {
        const { title, price, description, image, duration } = serviceDto;
        try {
            return await this.prismaService.service.create({
                data: {
                    title: title.trim(),
                    price,
                    duration: Math.round(duration),
                    description: description?.trim() || null,
                    image: image ?? null,
                },
            });
        } catch (error) {
            throw new BadRequestException('Error al crear el servicio');
        }
    }

    async getServices() {
        return this.prismaService.service.findMany({ orderBy: { createdAt: 'asc' } });
    }

    async getService(id: string) {
        const service = await this.prismaService.service.findUnique({ where: { id } });
        if (!service) throw new NotFoundException('Servicio no encontrado');
        return service;
    }

    async updateService(id: string, serviceDto: ServiceDto) {
        const { title, price, description, image, duration } = serviceDto;
        await this.getService(id);
        return this.prismaService.service.update({
            where: { id },
            data: {
                title: title.trim(),
                price,
                duration: Math.round(duration),
                description: description?.trim() || null,
                ...(image !== undefined ? { image } : {}),
            },
        });
    }

    /** Borra el servicio y sus citas (en cascada), limpiando también los eventos de Google Calendar. */
    async deleteService(id: string) {
        await this.getService(id);
        const appointments = await this.prismaService.appointment.findMany({
            where: { serviceId: id, googleEventId: { not: null } },
            select: { googleEventId: true },
        });
        await Promise.all(appointments.map(a => this.googleCalendarService.deleteEvent(a.googleEventId)));

        return this.prismaService.service.delete({ where: { id } });
    }
}
