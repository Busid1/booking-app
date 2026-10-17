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

    private withStaffIds<T extends { staff: { id: string }[] }>(service: T) {
        const { staff, ...rest } = service;
        return { ...rest, staffIds: staff.map(s => s.id) };
    }

    private validateDeposit(dto: ServiceDto) {
        if (dto.deposit && dto.deposit > dto.price) {
            throw new BadRequestException('La señal no puede ser mayor que el precio del servicio');
        }
        if (dto.deposit && dto.deposit > 0 && dto.deposit < 0.5) {
            throw new BadRequestException('La señal mínima es de 0,50 €');
        }
    }

    async createService(serviceDto: ServiceDto) {
        const { title, price, description, image, duration, category, deposit, staffIds } = serviceDto;
        this.validateDeposit(serviceDto);
        try {
            const count = await this.prismaService.service.count();
            const service = await this.prismaService.service.create({
                data: {
                    title: title.trim(),
                    price,
                    duration: Math.round(duration),
                    description: description?.trim() || null,
                    image: image ?? null,
                    category: category?.trim() || null,
                    deposit: deposit || null,
                    order: serviceDto.order ?? count,
                    staff: staffIds?.length ? { connect: staffIds.map(id => ({ id })) } : undefined,
                },
                include: { staff: { select: { id: true } } },
            });
            return this.withStaffIds(service);
        } catch (error) {
            throw new BadRequestException('Error al crear el servicio');
        }
    }

    async getServices() {
        const services = await this.prismaService.service.findMany({
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            include: { staff: { select: { id: true } } },
        });
        return services.map(s => this.withStaffIds(s));
    }

    async getService(id: string) {
        const service = await this.prismaService.service.findUnique({ where: { id }, include: { staff: { select: { id: true } } } });
        if (!service) throw new NotFoundException('Servicio no encontrado');
        return this.withStaffIds(service);
    }

    async updateService(id: string, serviceDto: ServiceDto) {
        const { title, price, description, image, duration, category, deposit, staffIds } = serviceDto;
        this.validateDeposit(serviceDto);
        await this.getService(id);
        const service = await this.prismaService.service.update({
            where: { id },
            data: {
                title: title.trim(),
                price,
                duration: Math.round(duration),
                description: description?.trim() || null,
                category: category !== undefined ? category.trim() || null : undefined,
                deposit: deposit !== undefined ? deposit || null : undefined,
                order: serviceDto.order,
                staff: staffIds ? { set: staffIds.map(sid => ({ id: sid })) } : undefined,
                ...(image !== undefined ? { image } : {}),
            },
            include: { staff: { select: { id: true } } },
        });
        return this.withStaffIds(service);
    }

    async reorder(ids: string[]) {
        await this.prismaService.$transaction(
            ids.map((id, order) => this.prismaService.service.updateMany({ where: { id }, data: { order } })),
        );
        return this.getServices();
    }

    /** Borra el servicio y sus citas (en cascada), limpiando también los eventos de Google Calendar. */
    async deleteService(id: string) {
        const service = await this.getService(id);
        const appointments = await this.prismaService.appointment.findMany({
            where: { serviceId: id, googleEventId: { not: null } },
            select: { googleEventId: true, staff: { select: { calendarId: true } } },
        });
        await Promise.all(appointments.map(a => this.googleCalendarService.deleteEvent(a.googleEventId, a.staff?.calendarId)));

        await this.prismaService.service.delete({ where: { id } });
        return service;
    }
}
