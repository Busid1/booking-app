import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { StaffDto, StaffHoursDto } from '../dto/staff.dto';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'profesional';
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService, private readonly scheduling: SchedulingService) {}

  private async uniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    for (let i = 2; ; i++) {
      const existing = await this.prisma.staff.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${i}`;
    }
  }

  private validateHours(hours?: StaffHoursDto[]) {
    for (const day of hours ?? []) {
      if (day.isClosed) continue;
      const sorted = [...day.timeBlocks].sort((a, b) => a.openTime.localeCompare(b.openTime));
      sorted.forEach((b, i) => {
        if (b.openTime >= b.closeTime) throw new BadRequestException('Cada tramo debe abrir antes de cerrar');
        if (i > 0 && b.openTime < sorted[i - 1].closeTime) throw new BadRequestException('Hay tramos horarios que se solapan');
      });
    }
  }

  /** Vincula (o desvincula) una cuenta de usuario para que el trabajador vea su agenda. */
  private async resolveAccess(accessEmail: string | undefined, staffId?: string): Promise<string | null | undefined> {
    if (accessEmail === undefined) return undefined;
    const email = accessEmail.trim().toLowerCase();

    const current = staffId ? await this.prisma.staff.findUnique({ where: { id: staffId }, include: { user: true } }) : null;
    if (current?.user && current.user.email !== email && current.user.role === 'staff') {
      await this.prisma.user.update({ where: { id: current.user.id }, data: { role: 'user' } });
    }
    if (!email) return null;

    const user = await this.prisma.user.findUnique({ where: { email }, include: { staff: true } });
    if (!user) {
      throw new BadRequestException('No existe ninguna cuenta con ese email. El trabajador debe registrarse primero en la web.');
    }
    if (user.staff && user.staff.id !== staffId) {
      throw new BadRequestException('Esa cuenta ya está vinculada a otro trabajador');
    }
    if (user.role === 'user') await this.prisma.user.update({ where: { id: user.id }, data: { role: 'staff' } });
    return user.id;
  }

  private async replaceHours(staffId: string, hours?: StaffHoursDto[]) {
    if (!hours) return;
    await this.prisma.$transaction([
      this.prisma.staffHours.deleteMany({ where: { staffId } }),
      this.prisma.staffHours.createMany({
        data: hours.map(h => ({
          staffId,
          dayOfWeek: h.dayOfWeek,
          isClosed: h.isClosed || !h.timeBlocks.length,
          timeBlocks: h.isClosed ? [] : h.timeBlocks.map(b => ({ openTime: b.openTime, closeTime: b.closeTime })) as any,
        })),
      }),
    ]);
  }

  async create(dto: StaffDto) {
    this.validateHours(dto.hours);
    const userId = await this.resolveAccess(dto.accessEmail);
    const count = await this.prisma.staff.count();
    const staff = await this.prisma.staff.create({
      data: {
        name: dto.name.trim(),
        slug: await this.uniqueSlug(dto.name),
        bio: dto.bio?.trim() || null,
        color: dto.color ?? '#4f46e5',
        active: dto.active ?? true,
        order: dto.order ?? count,
        useBusinessHours: dto.useBusinessHours ?? true,
        calendarId: dto.calendarId?.trim() || null,
        userId: userId ?? null,
        services: dto.serviceIds ? { connect: dto.serviceIds.map(id => ({ id })) } : undefined,
      },
    });
    await this.replaceHours(staff.id, dto.hours);
    return this.findOneAdmin(staff.id);
  }

  async update(id: string, dto: StaffDto) {
    const existing = await this.prisma.staff.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Trabajador no encontrado');
    this.validateHours(dto.hours);
    const userId = await this.resolveAccess(dto.accessEmail, id);

    await this.prisma.staff.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        slug: dto.name.trim() !== existing.name ? await this.uniqueSlug(dto.name, id) : undefined,
        bio: dto.bio !== undefined ? dto.bio.trim() || null : undefined,
        color: dto.color,
        active: dto.active,
        order: dto.order,
        useBusinessHours: dto.useBusinessHours,
        calendarId: dto.calendarId !== undefined ? dto.calendarId.trim() || null : undefined,
        userId,
        services: dto.serviceIds ? { set: dto.serviceIds.map(sid => ({ id: sid })) } : undefined,
      },
    });
    await this.replaceHours(id, dto.hours);
    return this.findOneAdmin(id);
  }

  async setPhoto(id: string, photo: string | null) {
    const existing = await this.prisma.staff.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Trabajador no encontrado');
    await this.prisma.staff.update({ where: { id }, data: { photo } });
    return { previous: existing.photo, staff: await this.findOneAdmin(id) };
  }

  async remove(id: string) {
    const existing = await this.prisma.staff.findUnique({ where: { id }, include: { user: true } });
    if (!existing) throw new NotFoundException('Trabajador no encontrado');
    if (existing.user?.role === 'staff') {
      await this.prisma.user.update({ where: { id: existing.user.id }, data: { role: 'user' } });
    }
    // Las citas del trabajador se conservan sin trabajador asignado (onDelete: SetNull).
    await this.prisma.staff.delete({ where: { id } });
    return existing;
  }

  async findOneAdmin(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: { hours: true, services: { select: { id: true } }, user: { select: { email: true } } },
    });
    if (!staff) throw new NotFoundException('Trabajador no encontrado');
    return this.toAdmin(staff);
  }

  private toAdmin(staff: any) {
    const { services, user, userId, hours, ...rest } = staff;
    return {
      ...rest,
      serviceIds: services.map((s: { id: string }) => s.id),
      accessEmail: user?.email ?? '',
      hours: [...hours]
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map((h: any) => ({ dayOfWeek: h.dayOfWeek, isClosed: h.isClosed, timeBlocks: h.timeBlocks })),
    };
  }

  async findAllAdmin() {
    const list = await this.prisma.staff.findMany({
      include: { hours: true, services: { select: { id: true } }, user: { select: { email: true } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return list.map(s => this.toAdmin(s));
  }

  /** Lista pública: sin datos internos, con el horario semanal efectivo y la valoración media. */
  async findPublic() {
    const [list, businessWeek, ratings] = await Promise.all([
      this.prisma.staff.findMany({
        where: { active: true },
        include: { hours: true, services: { select: { id: true } } },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
      this.scheduling.businessWeek(),
      this.prisma.review.groupBy({
        by: ['staffId'],
        where: { visible: true, staffId: { not: null } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    return list.map(s => {
      const r = ratings.find(x => x.staffId === s.id);
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        bio: s.bio,
        photo: s.photo,
        color: s.color,
        serviceIds: s.services.map(x => x.id),
        schedule: this.scheduling.staffWeek(s, businessWeek),
        rating: r?._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
        reviewCount: r?._count._all ?? 0,
      };
    });
  }

  /** Trabajador vinculado a una cuenta (para usuarios con rol staff). */
  async findByUser(userId: string) {
    return this.prisma.staff.findUnique({ where: { userId } });
  }
}
