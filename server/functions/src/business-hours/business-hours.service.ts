import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessHoursDto, TimeBlockDto } from '../dto/business-hours.dto';

const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

@Injectable()
export class BusinessHoursService {
    constructor(private readonly prismaService: PrismaService) { }

    private validateBlocks(day: number, blocks: TimeBlockDto[]) {
        const sorted = [...blocks].sort((a, b) => a.openTime.localeCompare(b.openTime));
        sorted.forEach((block, i) => {
            if (block.openTime >= block.closeTime) {
                throw new BadRequestException(`El ${DAY_NAMES[day]}: la hora de apertura debe ser anterior a la de cierre`);
            }
            if (i > 0 && block.openTime < sorted[i - 1].closeTime) {
                throw new BadRequestException(`El ${DAY_NAMES[day]}: hay tramos horarios que se solapan`);
            }
        });
        return sorted;
    }

    async saveBusinessHours(businessHoursDto: BusinessHoursDto[]) {
        const operations = businessHoursDto.map(item => {
            const blocks = item.isClosed ? [] : this.validateBlocks(item.dayOfWeek, item.timeBlocks);
            const isClosed = item.isClosed || blocks.length === 0;
            const create = blocks.map(({ openTime, closeTime }) => ({ openTime, closeTime }));

            return this.prismaService.businessHours.upsert({
                where: { dayOfWeek: item.dayOfWeek },
                update: { isClosed, timeBlocks: { deleteMany: {}, create } },
                create: { dayOfWeek: item.dayOfWeek, isClosed, timeBlocks: { create } },
                include: { timeBlocks: true },
            });
        });

        return this.prismaService.$transaction(operations);
    }

    async getBusinessHours() {
        const hours = await this.prismaService.businessHours.findMany({
            include: { timeBlocks: true },
            orderBy: { dayOfWeek: 'asc' },
        });
        return hours.map(h => ({
            ...h,
            timeBlocks: [...h.timeBlocks].sort((a, b) => a.openTime.localeCompare(b.openTime)),
        }));
    }
}
