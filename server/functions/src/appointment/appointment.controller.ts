import { Controller, Post, Body, Get, Delete, Patch, Param, Put, Query, BadRequestException } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentDto } from '../dto/appointment.dto';
import { GetUser } from '../auth/get-user.decorator';
import { AdminOnly, Authenticated } from '../auth/admin.guard';
import { AuthUser } from '../auth/auth-user.interface';
import { DATE_REGEX } from '../common/time.utils';

@Controller()
export class AppointmentController {
    constructor(private readonly appointmentService: AppointmentService) { }

    @Post('create-appointment')
    @Authenticated()
    createAppointment(@Body() appointmentDto: AppointmentDto, @GetUser() user: AuthUser) {
        return this.appointmentService.createAppointment(appointmentDto, user);
    }

    /** Franjas ocupadas de un día (sin datos personales) para calcular disponibilidad. */
    @Get('availability')
    getAvailability(@Query('date') date: string) {
        if (!date || !DATE_REGEX.test(date)) {
            throw new BadRequestException('Parámetro "date" inválido (YYYY-MM-DD)');
        }
        return this.appointmentService.getBusySlots(date);
    }

    @Get('get-appointments')
    @AdminOnly()
    getAppointments() {
        return this.appointmentService.getAppointments();
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
}
