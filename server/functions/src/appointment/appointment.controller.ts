import { Controller, Post, Body, Get, UseGuards, Delete, Patch, Param, Put } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentDto } from '../dto/appointment.dto';
import { GetUser } from '../auth/get-user.decorator';
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

    @Patch('/sync-from-google')
    async syncFromGoogle() {
        return this.appointmentService.syncFromGoogle();
    }

    @Put('update-appointment/:id')
    async updateAppointment(@Param('id') id: string, @Body() appointmentDto: AppointmentDto,
    ) {
        return this.appointmentService.updateAppointment(id, appointmentDto);
    }
}