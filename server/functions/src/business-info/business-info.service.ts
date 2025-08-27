import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessInfoDto } from '../dto/business-info.dto';

@Injectable()
export class BusinessInfoService {
    constructor(private readonly prismaService: PrismaService) { }
    async saveBusinessInfo(businessInfoDto: BusinessInfoDto) {
        const { name, description, address, phone, email, images } = businessInfoDto;

        try {
            await this.prismaService.businessInfo.upsert({
                where: { id: 1 },
                update: { name, description, address, phone, email },
                create: { name, description, address, phone, email },
            });

        } catch (error) {
            console.error(error);
            throw new BadRequestException('Error al guardar la información de contacto');
        }
    }

    async updateImages(newImages: string[]) {
        const info = await this.prismaService.businessInfo.findFirst();
        if (!info) throw new Error('No existe la información del negocio');

        const updated = [...info.images.filter(Boolean), ...newImages];
        return this.prismaService.businessInfo.update({
            where: { id: info.id },
            data: { images: updated }
        });
    }

    async getBusinessInfo() {
        return this.prismaService.businessInfo.findMany()
    }

    async removeBusinessImage(url: string) {
        const info = await this.prismaService.businessInfo.findFirst();
        if (!info) return;

        const updatedImages = info.images.filter(img => img !== url);
        return this.prismaService.businessInfo.update({
            where: { id: info.id },
            data: { images: updatedImages }
        });
    }

}