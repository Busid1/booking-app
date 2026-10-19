import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentDto } from '../dto/appointment.dto';
import { GoogleCalendarService } from '../google-calendar/googleCalendar.service';
import { AuthUser } from '../auth/auth-user.interface';
import { SchedulingService, StaffWithHours } from '../scheduling/scheduling.service';
import { MailService, AppointmentEmailData } from '../mail/mail.service';
import { StripeService } from '../payments/stripe.service';
import { PushService } from '../push/push.service';
import { appConfig } from '../common/app-config';
import { assertUnderLimit, rateLimit, recordHit } from '../common/rate-limit';
import { verifyTurnstile } from '../common/turnstile';
import {
    addDaysToKey, mondayBasedDayIndex, minutesUntil, nowInBusinessTimezone, toMinutes, toTimeString,
} from '../common/time.utils';

const userPublicSelect = { id: true, email: true, name: true, phone: true };
const staffPublicSelect = { id: true, name: true, photo: true, color: true, slug: true, calendarId: true };

const fullInclude = {
    service: true,
    user: { select: userPublicSelect },
    staff: { select: staffPublicSelect },
    review: { select: { id: true, rating: true } },
} satisfies Prisma.AppointmentInclude;

type FullAppointment = Prisma.AppointmentGetPayload<{ include: typeof fullInclude }>;

@Injectable()
export class AppointmentService {
    private readonly logger = new Logger(AppointmentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly googleCalendar: GoogleCalendarService,
        private readonly scheduling: SchedulingService,
        private readonly mail: MailService,
        private readonly stripe: StripeService,
        private readonly push: PushService,
    ) { }

    // ---------------------------------------------------------------- utilidades

    private newToken(): string {
        return randomBytes(24).toString('base64url');
    }

    private async getServiceOrFail(serviceId: string) {
        const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) throw new BadRequestException('El servicio seleccionado no existe');
        return service;
    }

    private computeEndTime(startTime: string, duration: number): string {
        const end = toMinutes(startTime) + duration;
        if (end > 24 * 60) throw new BadRequestException('La cita no puede terminar después de medianoche');
        return toTimeString(end);
    }

    private assertNotInPast(date: string, startTime: string) {
        if (minutesUntil(date, startTime) <= 0) {
            throw new BadRequestException('No se pueden reservar citas en el pasado');
        }
    }

    private async businessInfo() {
        return this.prisma.businessInfo.findUnique({ where: { id: 1 } });
    }

    /** Email del negocio para "responder a" en los emails al cliente, solo si es público. */
    private replyToOf(info: { email: string; showEmail: boolean } | null): string | null {
        return info?.showEmail === false ? null : info?.email || null;
    }

    private clientNameOf(a: FullAppointment): string {
        return a.clientName || a.user?.name || 'Cliente';
    }

    private clientEmailOf(a: FullAppointment): string | null {
        return a.clientEmail || a.user?.email || null;
    }

    private async emailData(a: FullAppointment): Promise<AppointmentEmailData> {
        const info = await this.businessInfo();
        return {
            businessName: info?.name || 'Bookly',
            businessAddress: info?.showAddress === false ? null : info?.address,
            businessPhone: info?.showPhone === false ? null : info?.phone,
            primaryColor: info?.primaryColor,
            cancellationHours: info?.cancellationHours ?? 0,
            clientName: this.clientNameOf(a),
            serviceTitle: a.service.title,
            staffName: a.staff?.name,
            date: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            price: a.service.price,
            depositPaid: a.depositPaid,
            manageToken: a.manageToken,
        };
    }

    private calendarData(a: FullAppointment) {
        const client = this.clientNameOf(a);
        return {
            summary: `${a.service.title} · ${client}${a.staff ? ` (${a.staff.name})` : ''}`,
            date: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            price: a.service.price,
            duration: a.service.duration,
            client,
            service: a.service.title,
            staff: a.staff?.name,
            contact: [this.clientEmailOf(a), a.clientPhone || a.user?.phone].filter(Boolean).join(' · '),
        };
    }

    private async findFull(id: string): Promise<FullAppointment> {
        const a = await this.prisma.appointment.findUnique({ where: { id }, include: fullInclude });
        if (!a) throw new NotFoundException('Cita no encontrada');
        return a;
    }

    // ---------------------------------------------------------------- notificaciones push

    /** Administradores y el profesional de la cita (si tiene acceso a la web). */
    private async businessPushTarget(a: FullAppointment) {
        const staffUser = a.staffId
            ? await this.prisma.staff.findUnique({ where: { id: a.staffId }, select: { userId: true } })
            : null;
        return { userIds: [...(await this.push.adminUserIds()), staffUser?.userId] };
    }

    private clientPushTarget(a: FullAppointment) {
        return { userIds: [a.userId], manageTokens: [a.manageToken] };
    }

    private whenText(a: { date: string; startTime: string }): string {
        return `${this.mail.formatDate(a.date)} a las ${a.startTime}`;
    }

    private clientUrl(a: FullAppointment): string {
        return a.manageToken ? `/cita/${a.manageToken}` : '/mis-citas';
    }

    /** Evento de Google Calendar + emails al confirmar una cita. Nunca lanza. */
    private async afterConfirmed(a: FullAppointment): Promise<FullAppointment> {
        try {
            const eventId = await this.googleCalendar.createEvent(this.calendarData(a), a.staff?.calendarId);
            if (eventId) {
                a = await this.prisma.appointment.update({ where: { id: a.id }, data: { googleEventId: eventId }, include: fullInclude });
            }
            const data = await this.emailData(a);
            const info = await this.businessInfo();
            const toClient = this.mail.confirmationEmail(data);
            await this.mail.send(this.clientEmailOf(a), toClient.subject, toClient.html, this.replyToOf(info));
            const toBusiness = this.mail.businessNotification(
                { ...data, clientEmail: this.clientEmailOf(a), clientPhone: a.clientPhone || a.user?.phone }, 'new');
            await this.mail.send(process.env.NOTIFY_EMAIL || info?.email, toBusiness.subject, toBusiness.html, this.clientEmailOf(a));
            await this.push.send(await this.businessPushTarget(a), {
                title: `Nueva reserva · ${this.clientNameOf(a)}`,
                body: `${a.service.title}${a.staff ? ` con ${a.staff.name}` : ''}\n${this.whenText(a)}`,
                url: '/panel',
                tag: `appointment-${a.id}`,
            });
        } catch (error) {
            this.logger.error('Error en tareas posteriores a la confirmación', error as Error);
        }
        return a;
    }

    /** `byBusiness`: la cancela el negocio (avisa al cliente) o el propio cliente (avisa al negocio). */
    private async afterCancelled(a: FullAppointment, notifyClient: boolean, byBusiness: boolean) {
        try {
            await this.googleCalendar.deleteEvent(a.googleEventId, a.staff?.calendarId);
            if (a.status !== 'confirmed') return;
            const data = await this.emailData(a);
            const info = await this.businessInfo();
            if (notifyClient) {
                const mail = this.mail.cancellationEmail(data);
                await this.mail.send(this.clientEmailOf(a), mail.subject, mail.html, this.replyToOf(info));
            }
            const toBusiness = this.mail.businessNotification(
                { ...data, clientEmail: this.clientEmailOf(a), clientPhone: a.clientPhone || a.user?.phone }, 'cancelled');
            await this.mail.send(process.env.NOTIFY_EMAIL || info?.email, toBusiness.subject, toBusiness.html);
            if (byBusiness) {
                await this.push.send(this.clientPushTarget(a), {
                    title: 'Tu cita ha sido cancelada',
                    body: `${a.service.title} · ${this.whenText(a)}`,
                    url: '/servicios',
                    tag: `appointment-${a.id}`,
                });
            } else {
                await this.push.send(await this.businessPushTarget(a), {
                    title: `Cita cancelada · ${this.clientNameOf(a)}`,
                    body: `${a.service.title}${a.staff ? ` con ${a.staff.name}` : ''}\n${this.whenText(a)}`,
                    url: '/panel',
                    tag: `appointment-${a.id}`,
                });
            }
        } catch (error) {
            this.logger.error('Error en tareas posteriores a la cancelación', error as Error);
        }
    }

    /**
     * Elige el trabajador para una cita.
     * - Sin trabajadores en el negocio: agenda única (staffId null).
     * - Con trabajadores: el indicado, o el disponible con menos citas ese día si es 'any'.
     */
    private async pickStaff(opts: {
        date: string; startTime: string; endTime: string; serviceId: string;
        requested?: string | null; enforceSchedule: boolean; excludeId?: string;
    }): Promise<StaffWithHours | null> {
        const { date, startTime, endTime } = opts;
        const appointments = await this.scheduling.activeAppointmentsOn(date, opts.excludeId);
        const businessWeek = await this.scheduling.businessWeek();
        const dayIndex = mondayBasedDayIndex(date);

        if (!(await this.scheduling.hasActiveStaff()) && (!opts.requested || opts.requested === 'any')) {
            if (opts.enforceSchedule && !this.scheduling.fitsSchedule(businessWeek[dayIndex], startTime, endTime)) {
                throw new BadRequestException('La hora seleccionada está fuera del horario del negocio');
            }
            this.assertFree(this.scheduling.busyFor(appointments, null), appointments, startTime, endTime);
            return null;
        }

        let candidates = await this.scheduling.eligibleStaff(opts.serviceId);
        if (opts.requested && opts.requested !== 'any') {
            const requested = candidates.find(s => s.id === opts.requested)
                ?? (opts.enforceSchedule ? undefined : await this.prisma.staff.findUnique({ where: { id: opts.requested }, include: { hours: true } }));
            if (!requested) throw new BadRequestException('El profesional seleccionado no realiza este servicio');
            candidates = [requested];
        }
        if (!candidates.length) throw new BadRequestException('No hay profesionales disponibles para este servicio');

        const load = (id: string) => appointments.filter(a => a.staffId === id).length;
        const sorted = [...candidates].sort((a, b) => load(a.id) - load(b.id));

        let lastError = 'Ese horario ya está ocupado. Elige otra hora.';
        for (const staff of sorted) {
            const day = this.scheduling.staffWeek(staff, businessWeek)[dayIndex];
            if (opts.enforceSchedule && !this.scheduling.fitsSchedule(day, startTime, endTime)) {
                lastError = candidates.length === 1
                    ? `${staff.name} no trabaja a esa hora`
                    : 'La hora seleccionada está fuera del horario';
                continue;
            }
            if (this.scheduling.overlaps(this.scheduling.busyFor(appointments, staff.id), startTime, endTime)) continue;
            return staff;
        }
        throw new ConflictException(lastError);
    }

    private assertFree(busy: (readonly [number, number])[], all: { startTime: string; endTime: string }[], start: string, end: string) {
        if (!this.scheduling.overlaps(busy, start, end)) return;
        const s = toMinutes(start);
        const e = toMinutes(end);
        const clash = all.find(a => s < toMinutes(a.endTime) && toMinutes(a.startTime) < e);
        throw new ConflictException(
            `Ese horario ya está ocupado${clash ? ` (${clash.startTime} - ${clash.endTime})` : ''}. Elige otra hora.`,
        );
    }

    private async assertCanCancel(a: { date: string; startTime: string; status: string }) {
        if (a.status === 'pending_payment') return;
        const minutes = minutesUntil(a.date, a.startTime);
        if (minutes <= 0) throw new BadRequestException('No se pueden cancelar citas pasadas');
        const hours = (await this.businessInfo())?.cancellationHours ?? 0;
        if (hours > 0 && minutes < hours * 60) {
            throw new BadRequestException(
                `Solo se puede cancelar con al menos ${hours} h de antelación. Contacta con el negocio para cualquier cambio.`,
            );
        }
    }

    // ---------------------------------------------------------------- crear / editar

    async createAppointment(dto: AppointmentDto, user: AuthUser | undefined, ip: string) {
        const isAdmin = user?.role === 'admin';
        const isGuest = !user;
        const service = await this.getServiceOrFail(dto.serviceId);
        const endTime = this.computeEndTime(dto.startTime, service.duration);
        this.assertNotInPast(dto.date, dto.startTime);

        let clientName = dto.clientName?.trim() || null;
        let clientEmail = dto.clientEmail?.trim().toLowerCase() || null;
        let clientPhone = dto.clientPhone?.trim() || null;

        if (isGuest) {
            if (!clientName) throw new BadRequestException('Indica tu nombre');
            if (!clientEmail && !clientPhone) throw new BadRequestException('Indica un email o un teléfono de contacto');
            rateLimit(`book-attempt:${ip}`, 20, 60 * 60_000);
            assertUnderLimit(`book:${ip}`, 5, 60 * 60_000, 'Has hecho demasiadas reservas seguidas. Inténtalo más tarde.');
            await verifyTurnstile(dto.turnstileToken, ip);

            const now = nowInBusinessTimezone();
            const upcoming = await this.prisma.appointment.count({
                where: {
                    userId: null,
                    date: { gte: now.date },
                    OR: [
                        ...(clientEmail ? [{ clientEmail }] : []),
                        ...(clientPhone ? [{ clientPhone }] : []),
                    ],
                },
            });
            if (upcoming >= 3) {
                throw new BadRequestException('Ya tienes 3 citas pendientes. Cancela alguna o crea una cuenta para reservar más.');
            }
        } else if (!isAdmin) {
            clientName = user.name || clientName;
            clientEmail = user.email;
            const profile = await this.prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } });
            clientPhone = clientPhone || profile?.phone || null;
        }

        await this.scheduling.purgeExpiredPending();
        const staff = await this.pickStaff({
            date: dto.date, startTime: dto.startTime, endTime, serviceId: service.id,
            requested: dto.staffId, enforceSchedule: !isAdmin,
        });

        if (isGuest) recordHit(`book:${ip}`);

        const needsDeposit = !isAdmin && !!service.deposit && service.deposit > 0 && this.stripe.enabled;

        const created = await this.prisma.appointment.create({
            data: {
                date: dto.date,
                startTime: dto.startTime,
                endTime,
                clientName,
                clientEmail,
                clientPhone,
                status: needsDeposit ? 'pending_payment' : 'confirmed',
                manageToken: this.newToken(),
                userId: user?.id ?? null,
                serviceId: service.id,
                staffId: staff?.id ?? null,
            },
            include: fullInclude,
        });

        if (needsDeposit) {
            try {
                const base = `${appConfig.webUrl}/cita/${created.manageToken}`;
                const session = await this.stripe.createCheckout({
                    appointmentId: created.id,
                    amount: service.deposit!,
                    description: `Señal · ${service.title} (${dto.date} ${dto.startTime})`,
                    customerEmail: clientEmail,
                    successUrl: `${base}?pago=ok`,
                    cancelUrl: `${base}?pago=cancelado`,
                });
                await this.prisma.appointment.update({ where: { id: created.id }, data: { stripeSessionId: session.id } });
                return { ...created, checkoutUrl: session.url };
            } catch (error) {
                await this.prisma.appointment.delete({ where: { id: created.id } });
                throw error;
            }
        }

        return this.afterConfirmed(created);
    }

    async updateAppointment(id: string, dto: AppointmentDto) {
        const existing = await this.findFull(id);
        const service = await this.getServiceOrFail(dto.serviceId);
        const endTime = this.computeEndTime(dto.startTime, service.duration);

        // Si no se indica trabajador, se mantiene el actual.
        const requested = dto.staffId === undefined || dto.staffId === '' ? existing.staffId : dto.staffId;
        const staff = await this.pickStaff({
            date: dto.date, startTime: dto.startTime, endTime, serviceId: service.id,
            requested, enforceSchedule: false, excludeId: id,
        });

        let updated = await this.prisma.appointment.update({
            where: { id },
            data: {
                date: dto.date,
                startTime: dto.startTime,
                endTime,
                serviceId: service.id,
                staffId: staff?.id ?? null,
                clientName: dto.clientName?.trim() || existing.clientName,
                clientEmail: dto.clientEmail !== undefined ? dto.clientEmail.trim().toLowerCase() || null : existing.clientEmail,
                clientPhone: dto.clientPhone !== undefined ? dto.clientPhone.trim() || null : existing.clientPhone,
                // Si cambia la fecha u hora, se vuelve a enviar el recordatorio.
                reminderSentAt: existing.date !== dto.date || existing.startTime !== dto.startTime ? null : undefined,
            },
            include: fullInclude,
        });

        if (updated.status === 'confirmed') {
            const oldCalendar = existing.staff?.calendarId ?? null;
            const newCalendar = updated.staff?.calendarId ?? null;
            let eventId = updated.googleEventId;
            if (eventId && oldCalendar !== newCalendar) {
                await this.googleCalendar.deleteEvent(eventId, oldCalendar);
                eventId = null;
            }
            const newEventId = await this.googleCalendar.upsertEvent(eventId, this.calendarData(updated), newCalendar);
            if (newEventId !== updated.googleEventId) {
                updated = await this.prisma.appointment.update({ where: { id }, data: { googleEventId: newEventId }, include: fullInclude });
            }
            if (existing.date !== updated.date || existing.startTime !== updated.startTime) {
                await this.push.send(this.clientPushTarget(updated), {
                    title: 'Tu cita ha cambiado de hora',
                    body: `${updated.service.title}\nNueva fecha: ${this.whenText(updated)}`,
                    url: this.clientUrl(updated),
                    tag: `appointment-${updated.id}`,
                });
            }
        }
        return updated;
    }

    // ---------------------------------------------------------------- consultas

    async getAppointments(user: AuthUser) {
        let staffFilter: Prisma.AppointmentWhereInput = {};
        if (user.role === 'staff') {
            const staff = await this.prisma.staff.findUnique({ where: { userId: user.id } });
            if (!staff) return [];
            staffFilter = { staffId: staff.id };
        }
        return this.prisma.appointment.findMany({
            where: { ...staffFilter, status: { not: 'pending_payment' } },
            include: fullInclude,
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
    }

    /** Compatibilidad con la versión anterior de la web: rangos ocupados de un día. */
    async getBusySlots(date: string) {
        return this.scheduling.activeAppointmentsOn(date).then(list =>
            list.map(a => ({ startTime: a.startTime, endTime: a.endTime })).sort((a, b) => a.startTime.localeCompare(b.startTime)),
        );
    }

    async getSlots(date: string, serviceId: string, staffId?: string) {
        const service = await this.getServiceOrFail(serviceId);
        return { slots: await this.scheduling.availableSlots(date, service.id, service.duration, staffId || null) };
    }

    async getUserAppointments(userId: string) {
        return this.prisma.appointment.findMany({
            where: { userId, status: { not: 'pending_payment' } },
            include: fullInclude,
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
    }

    // ---------------------------------------------------------------- cancelar

    async deleteAppointment(id: string, user: AuthUser) {
        if (!id) throw new BadRequestException('Falta el id de la cita');
        const appointment = await this.findFull(id);

        if (user.role !== 'admin') {
            if (appointment.userId !== user.id) throw new ForbiddenException('No puedes cancelar citas de otros usuarios');
            await this.assertCanCancel(appointment);
        }

        await this.prisma.appointment.delete({ where: { id } });
        await this.afterCancelled(appointment, user.role === 'admin', user.role === 'admin');
        return { success: true, message: 'Cita eliminada correctamente' };
    }

    // ---------------------------------------------------------------- gestión con código (invitados)

    private async findByToken(token: string): Promise<FullAppointment> {
        if (!token || token.length < 20) throw new NotFoundException('Cita no encontrada');
        const a = await this.prisma.appointment.findFirst({ where: { manageToken: token }, include: fullInclude });
        if (!a) throw new NotFoundException('Cita no encontrada o ya cancelada');
        return a;
    }

    private async publicView(a: FullAppointment) {
        const info = await this.businessInfo();
        const cancellationHours = info?.cancellationHours ?? 0;
        const minutes = minutesUntil(a.date, a.startTime);
        const ended = minutesUntil(a.date, a.endTime) <= 0;
        return {
            id: a.id,
            date: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status,
            clientName: this.clientNameOf(a),
            service: { id: a.service.id, title: a.service.title, price: a.service.price, duration: a.service.duration, image: a.service.image },
            staff: a.staff ? { id: a.staff.id, name: a.staff.name, photo: a.staff.photo, color: a.staff.color } : null,
            depositPaid: a.depositPaid,
            cancellationHours,
            canCancel: a.status === 'pending_payment' || (minutes > 0 && (cancellationHours === 0 || minutes >= cancellationHours * 60)),
            canReview: ended && a.status === 'confirmed' && !a.review,
            review: a.review,
            ended,
            manageToken: a.manageToken,
        };
    }

    async getByToken(token: string) {
        let a = await this.findByToken(token);
        if (a.status === 'pending_payment') a = await this.refreshPayment(a);
        return this.publicView(a);
    }

    async getManyByTokens(tokens: string[]) {
        const valid = [...new Set(tokens)].filter(t => typeof t === 'string' && t.length >= 20).slice(0, 50);
        if (!valid.length) return [];
        const list = await this.prisma.appointment.findMany({
            where: { manageToken: { in: valid }, status: 'confirmed' },
            include: fullInclude,
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
        return Promise.all(list.map(a => this.publicView(a)));
    }

    async cancelByToken(token: string) {
        const a = await this.findByToken(token);
        await this.assertCanCancel(a);
        await this.prisma.appointment.delete({ where: { id: a.id } });
        await this.afterCancelled(a, true, false);
        return { success: true, message: 'Cita cancelada correctamente' };
    }

    // ---------------------------------------------------------------- pagos

    /** Consulta Stripe y confirma la cita si el pago se ha completado (por si el webhook tarda). */
    private async refreshPayment(a: FullAppointment): Promise<FullAppointment> {
        if (!a.stripeSessionId || !this.stripe.enabled) return a;
        try {
            const session = await this.stripe.getSession(a.stripeSessionId);
            if (session.payment_status === 'paid') return (await this.confirmPaid(a.id, session.amount_total)) ?? a;
        } catch (error) {
            this.logger.warn(`No se pudo consultar el pago de ${a.id}`);
        }
        return a;
    }

    /** Marca como pagada una cita pendiente (idempotente). */
    async confirmPaid(appointmentId: string, amountCents: number | null): Promise<FullAppointment | null> {
        const result = await this.prisma.appointment.updateMany({
            where: { id: appointmentId, status: 'pending_payment' },
            data: { status: 'confirmed', depositPaid: amountCents != null ? amountCents / 100 : null },
        });
        if (!result.count) return this.prisma.appointment.findUnique({ where: { id: appointmentId }, include: fullInclude });
        return this.afterConfirmed(await this.findFull(appointmentId));
    }

    async handleStripeEvent(event: any) {
        const session = event?.data?.object;
        const appointmentId = session?.metadata?.appointmentId || session?.client_reference_id;
        if (!appointmentId) return { received: true };

        if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
            await this.confirmPaid(appointmentId, session.amount_total ?? null);
        } else if (event.type === 'checkout.session.expired') {
            await this.prisma.appointment.deleteMany({ where: { id: appointmentId, status: 'pending_payment' } });
        }
        return { received: true };
    }

    // ---------------------------------------------------------------- recordatorios

    /** Envía recordatorios de las citas que empiezan en las próximas 24 h. Pensado para ejecutarse cada hora. */
    async sendReminders() {
        const today = nowInBusinessTimezone().date;
        const candidates = await this.prisma.appointment.findMany({
            where: {
                status: 'confirmed',
                reminderSentAt: null,
                date: { in: [today, addDaysToKey(today, 1)] },
                createdAt: { lt: new Date(Date.now() - 12 * 60 * 60_000) },
            },
            include: fullInclude,
        });

        let sent = 0;
        for (const a of candidates) {
            const minutes = minutesUntil(a.date, a.startTime);
            if (minutes <= 0 || minutes > 24 * 60) continue;
            let delivered = false;
            const email = this.clientEmailOf(a);
            if (email) {
                const mail = this.mail.reminderEmail(await this.emailData(a));
                delivered = await this.mail.send(email, mail.subject, mail.html, this.replyToOf(await this.businessInfo()));
            }
            const pushed = await this.push.send(this.clientPushTarget(a), {
                title: `Recordatorio: ${a.service.title}`,
                body: `${a.date === today ? 'Hoy' : 'Mañana'} a las ${a.startTime}${a.staff ? ` con ${a.staff.name}` : ''}`,
                url: this.clientUrl(a),
                tag: `reminder-${a.id}`,
            });
            if (delivered || pushed) sent++;
            await this.prisma.appointment.update({ where: { id: a.id }, data: { reminderSentAt: new Date() } });
        }
        return { checked: candidates.length, sent };
    }

    // ---------------------------------------------------------------- Google Calendar

    /**
     * Elimina las citas locales cuyo evento se borró en Google Calendar (en cada calendario usado).
     * Solo se comparan citas dentro de la ventana consultada para no borrar citas antiguas.
     */
    async syncFromGoogle() {
        if (!this.googleCalendar.enabled) return { synced: false, removed: 0 };
        const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const fromDate = timeMin.toISOString().slice(0, 10);

        const local = await this.prisma.appointment.findMany({
            where: { googleEventId: { not: null }, date: { gt: fromDate }, status: 'confirmed' },
            select: { id: true, googleEventId: true, staff: { select: { calendarId: true } } },
        });

        const byCalendar = new Map<string, typeof local>();
        const fallback = await this.googleCalendar.resolveCalendarId(null);
        for (const a of local) {
            const cal = a.staff?.calendarId || fallback;
            if (!cal) continue;
            byCalendar.set(cal, [...(byCalendar.get(cal) ?? []), a]);
        }

        const toDelete: string[] = [];
        let synced = true;
        for (const [calendarId, items] of byCalendar) {
            const ids = await this.googleCalendar.listEventIds(timeMin, calendarId);
            if (!ids) { synced = false; continue; }
            items.filter(a => !ids.has(a.googleEventId!)).forEach(a => toDelete.push(a.id));
        }

        if (toDelete.length) await this.prisma.appointment.deleteMany({ where: { id: { in: toDelete } } });
        return { synced, removed: toDelete.length };
    }
}
