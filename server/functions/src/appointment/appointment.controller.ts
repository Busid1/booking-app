import {
    BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Put, Query,
    RawBodyRequest, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AppointmentService } from './appointment.service';
import { AppointmentDto, ManageTokensDto } from '../dto/appointment.dto';
import { GetUser } from '../auth/get-user.decorator';
import { AdminOnly, Authenticated, StaffOrAdmin } from '../auth/admin.guard';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { AuthUser } from '../auth/auth-user.interface';
import { DATE_REGEX } from '../common/time.utils';
import { clientIp } from '../common/client-ip';
import { rateLimit } from '../common/rate-limit';
import { appConfig } from '../common/app-config';
import { StripeService } from '../payments/stripe.service';

@Controller()
export class AppointmentController {
    constructor(private readonly appointmentService: AppointmentService, private readonly stripe: StripeService) { }

    /** Reserva con cuenta (token) o como invitado (sin token). */
    @Post('create-appointment')
    @UseGuards(OptionalJwtGuard)
    createAppointment(@Body() appointmentDto: AppointmentDto, @GetUser() user: AuthUser | undefined, @Req() req: Request) {
        return this.appointmentService.createAppointment(appointmentDto, user, clientIp(req));
    }

    /** Versión anterior: franjas ocupadas de un día (sin datos personales). */
    @Get('availability')
    getAvailability(@Query('date') date: string) {
        if (!date || !DATE_REGEX.test(date)) throw new BadRequestException('Parámetro "date" inválido (YYYY-MM-DD)');
        return this.appointmentService.getBusySlots(date);
    }

    /** Horas de inicio libres para un servicio (y opcionalmente un profesional o 'any'). */
    @Get('availability/slots')
    getSlots(@Query('date') date: string, @Query('serviceId') serviceId: string, @Query('staffId') staffId?: string) {
        if (!date || !DATE_REGEX.test(date)) throw new BadRequestException('Parámetro "date" inválido (YYYY-MM-DD)');
        if (!serviceId) throw new BadRequestException('Falta el parámetro "serviceId"');
        return this.appointmentService.getSlots(date, serviceId, staffId);
    }

    @Get('get-appointments')
    @StaffOrAdmin()
    getAppointments(@GetUser() user: AuthUser) {
        return this.appointmentService.getAppointments(user);
    }

    @Get('get-user-appointments')
    @Authenticated()
    getUserAppointments(@GetUser() user: AuthUser) {
        return this.appointmentService.getUserAppointments(user.id);
    }

    @Delete('delete-appointment')
    @Authenticated()
    deleteAppointment(@Body('id') id: string, @GetUser() user: AuthUser) {
        return this.appointmentService.deleteAppointment(id, user);
    }

    @Patch('sync-from-google')
    @AdminOnly()
    syncFromGoogle() {
        return this.appointmentService.syncFromGoogle();
    }

    @Put('update-appointment/:id')
    @AdminOnly()
    updateAppointment(@Param('id') id: string, @Body() appointmentDto: AppointmentDto) {
        return this.appointmentService.updateAppointment(id, appointmentDto);
    }

    // ----- Gestión de citas con código secreto (invitados y enlaces de email)

    @Get('appointments/manage/:token')
    getByToken(@Param('token') token: string, @Req() req: Request) {
        rateLimit(`manage:${clientIp(req)}`, 120, 60 * 60_000);
        return this.appointmentService.getByToken(token);
    }

    @Post('appointments/manage/batch')
    getManyByTokens(@Body() dto: ManageTokensDto, @Req() req: Request) {
        rateLimit(`manage:${clientIp(req)}`, 120, 60 * 60_000);
        return this.appointmentService.getManyByTokens(dto.tokens);
    }

    @Delete('appointments/manage/:token')
    cancelByToken(@Param('token') token: string, @Req() req: Request) {
        rateLimit(`cancel:${clientIp(req)}`, 20, 60 * 60_000);
        return this.appointmentService.cancelByToken(token);
    }

    // ----- Pagos y tareas programadas

    @Post('payments/webhook')
    stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
        const event = this.stripe.verifyWebhook(req.rawBody, signature);
        return this.appointmentService.handleStripeEvent(event);
    }

    /** Llamado cada hora por Cloud Scheduler con la cabecera X-Cron-Secret. */
    @Post('cron/reminders')
    sendReminders(@Headers('x-cron-secret') secret: string) {
        if (!appConfig.cronSecret || secret !== appConfig.cronSecret) throw new ForbiddenException('No autorizado');
        return this.appointmentService.sendReminders();
    }
}
