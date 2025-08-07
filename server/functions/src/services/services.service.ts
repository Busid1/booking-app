import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceDto } from '../dto/service.dto';

@Injectable()
export class ServicesService {
    constructor(private readonly prismaService: PrismaService) { }
    async createService(serviceDto: ServiceDto) {
        const { title, price, description, image, duration } = serviceDto;

        try {
            const service = await this.prismaService.service.create({
                data: {
                    title,
                    price,
                    description,
                    image,
                    duration,
                },
            });
            return service;
        } catch (error) {
            throw new BadRequestException('Error creating service');
        }
    }

    async getServices() {
        return await this.prismaService.service.findMany()
    }

    async getService(id: string) {
        const service = await this.prismaService.service.findUnique({
            where: { id },
        });
        if (!service) {
            throw new BadRequestException('Service not found');
        }
        return service;
    }

    async updateService(id: string, serviceDto: ServiceDto) {
        const { title, price, description, image, duration } = serviceDto;

        try {
            const service = await this.prismaService.service.update({
                where: { id },
                data: {
                    title,
                    price,
                    description,
                    image,
                    duration,
                },
            });
            return service;
        } catch (error) {
            throw new BadRequestException('Error updating service');
        }
    }

    async deleteService(id: string) {
        try {
            await this.prismaService.service.delete({
                where: { id },
            });
        } catch (error) {
            throw new BadRequestException('Error deleting service');
        }
    }
}