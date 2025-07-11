import { Controller, Post, Body, Get, UseGuards, Delete, Patch, Param } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentDto } from 'src/dto/appointment.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppointmentController {
    constructor(private readonly appointmentService: AppointmentService) { }

    @Post('create-appointment')
    @UseGuards(AuthGuard('jwt'))
    async createAppointment(
        @Body() appointmentDto: AppointmentDto,
        @GetUser() user: { id: string },
    ) {
        return this.appointmentService.createAppointment(appointmentDto, user.id);
    }

    @Get('get-appointments')
    getAppointments() {
        return this.appointmentService.getAppointments();
    }

    @Get('get-user-appointments')
    @UseGuards(AuthGuard('jwt'))
    getUserAppointments(@GetUser() user: { id: string }) {
        return this.appointmentService.getUserAppointments(user.id);
    }

    @Delete('delete-appointment')
    deleteAppointment(@Body('id') id: string) {
        return this.appointmentService.deleteAppointment(id);
    }

    @Patch(':id/google-event')
    updateGoogleEventId(
        @Param('id') id: string,
        @Body('googleEventId') googleEventId: string,
    ) {
        return this.appointmentService.updateGoogleEventId(id, googleEventId);
    }
    @Patch('/sync-from-google')
    async syncFromGoogle() {
        return this.appointmentService.syncFromGoogleCalendar();
    }


}