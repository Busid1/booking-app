import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessInfoDto } from '../dto/business-info.dto';

const EMPTY_INFO = { name: 'Mi negocio', description: '', address: '', phone: '', email: '' };

@Injectable()
export class BusinessInfoService {
    static readonly MAX_IMAGES = 3;

    constructor(private readonly prismaService: PrismaService) { }

    async saveBusinessInfo(dto: BusinessInfoDto) {
        const data = {
            name: dto.name.trim(),
            description: dto.description.trim(),
            address: dto.address.trim(),
            phone: dto.phone.trim(),
            email: dto.email.trim(),
        };
        return this.prismaService.businessInfo.upsert({
            where: { id: 1 },
            update: data,
            create: { id: 1, ...data },
        });
    }

    async assertImageCapacity(incoming: number) {
        const info = await this.prismaService.businessInfo.findUnique({ where: { id: 1 } });
        const current = info?.images.filter(Boolean).length ?? 0;
        if (current + incoming > BusinessInfoService.MAX_IMAGES) {
            throw new BadRequestException(`Solo se permiten ${BusinessInfoService.MAX_IMAGES} imágenes en total`);
        }
    }

    async addImages(newImages: string[]) {
        const info = await this.prismaService.businessInfo.findUnique({ where: { id: 1 } });
        const images = [...(info?.images.filter(Boolean) ?? []), ...newImages];
        return this.prismaService.businessInfo.upsert({
            where: { id: 1 },
            update: { images },
            create: { id: 1, ...EMPTY_INFO, images },
        });
    }

    /** Se mantiene el formato de array por compatibilidad con clientes existentes. */
    async getBusinessInfo() {
        return this.prismaService.businessInfo.findMany({ where: { id: 1 } });
    }

    async removeBusinessImage(url: string) {
        const info = await this.prismaService.businessInfo.findUnique({ where: { id: 1 } });
        if (!info) return null;

        return this.prismaService.businessInfo.update({
            where: { id: 1 },
            data: { images: info.images.filter(img => img && img !== url) },
        });
    }
}
