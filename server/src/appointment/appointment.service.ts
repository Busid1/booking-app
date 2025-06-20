import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentDto } from 'src/dto/appointment.dto';

@Injectable()
export class AppointmentService {
    constructor(private readonly prismaService: PrismaService) { }
    async createAppointment(dto: AppointmentDto, userId: string) {
        const { date, startTime, endTime, serviceId } = dto;

        if (!userId || typeof userId !== 'string') {
            throw new BadRequestException('User ID inválido');
        }

        return await this.prismaService.appointment.create({
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
    }


    async getAppointments() {

    }
}