import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
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
        @GetUser() user: {id: string},
    ) {
        return this.appointmentService.createAppointment(appointmentDto, user.id);
    }

    @Get('get-appointments')
    getAppointments() {
        return this.appointmentService.getAppointments();
    }
}