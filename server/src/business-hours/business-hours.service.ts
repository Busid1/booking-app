import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessHoursDto } from 'src/dto/business-hours.dto';

@Injectable()
export class BusinessHoursService {
    constructor(private readonly prismaService: PrismaService) { }
    async saveBusinessHours(businessHoursDto: BusinessHoursDto[]) {
        try {
            const created: any = [];
            for (const item of businessHoursDto) {
                const businessHour = await this.prismaService.businessHours.upsert({
                    where: { dayOfWeek: item.dayOfWeek },
                    update: {
                        isClosed: item.isClosed,
                        timeBlocks: {
                            deleteMany: {},
                            create: item.timeBlocks.map(tb => ({
                                openTime: tb.openTime,
                                closeTime: tb.closeTime,
                            })),
                        },
                    },
                    create: {
                        dayOfWeek: item.dayOfWeek,
                        isClosed: item.isClosed,
                        timeBlocks: {
                            create: item.timeBlocks.map(tb => ({
                                openTime: tb.openTime,
                                closeTime: tb.closeTime,
                            })),
                        },
                    },
                    include: {
                        timeBlocks: true,
                    },
                });

                created.push(businessHour);
            }

            return created;
        } catch (error) {
            console.error(error);
            throw new BadRequestException('Error al guardar los horarios');
        }
    }

    async getBusinessHours() {
        return this.prismaService.businessHours.findMany({
            include: {
                timeBlocks: true
            }
        })
    }
}