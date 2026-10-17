import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from '../dto/review.dto';
import { AuthUser } from '../auth/auth-user.interface';
import { minutesUntil } from '../common/time.utils';

/** "María López" → "María L." para no publicar nombres completos. */
function displayName(name: string | null | undefined): string {
  const parts = (name || 'Cliente').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : parts[0];
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto, user?: AuthUser) {
    const appointment = dto.manageToken
      ? await this.prisma.appointment.findFirst({ where: { manageToken: dto.manageToken }, include: { review: true, user: true } })
      : dto.appointmentId && user
        ? await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId }, include: { review: true, user: true } })
        : null;

    if (!appointment) throw new NotFoundException('Cita no encontrada');
    if (!dto.manageToken && appointment.userId !== user?.id) throw new ForbiddenException('Solo puedes valorar tus propias citas');
    if (appointment.status !== 'confirmed') throw new BadRequestException('Esta cita no se puede valorar');
    if (minutesUntil(appointment.date, appointment.endTime) > 0) throw new BadRequestException('Podrás valorar la cita cuando haya terminado');
    if (appointment.review) throw new ConflictException('Ya has valorado esta cita');

    return this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        authorName: displayName(appointment.clientName || appointment.user?.name),
        userId: appointment.userId,
        appointmentId: appointment.id,
        staffId: appointment.staffId,
      },
    });
  }

  async findPublic() {
    const where = { visible: true };
    const [stats, reviews] = await Promise.all([
      this.prisma.review.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true, rating: true, comment: true, authorName: true, createdAt: true,
          staff: { select: { id: true, name: true } },
          appointment: { select: { service: { select: { title: true } } } },
        },
      }),
    ]);
    return {
      average: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : null,
      count: stats._count._all,
      reviews: reviews.map(({ appointment, ...r }) => ({ ...r, serviceTitle: appointment?.service.title ?? null })),
    };
  }

  findAll() {
    return this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: { staff: { select: { name: true } }, appointment: { select: { date: true, service: { select: { title: true } } } } },
    });
  }

  async setVisible(id: string, visible: boolean) {
    const exists = await this.prisma.review.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Reseña no encontrada');
    return this.prisma.review.update({ where: { id }, data: { visible } });
  }

  async remove(id: string) {
    await this.prisma.review.deleteMany({ where: { id } });
    return { success: true };
  }
}
