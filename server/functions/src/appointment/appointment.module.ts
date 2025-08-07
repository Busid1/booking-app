import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { GoogleCalendarService } from '../google-calendar/googleCalendar.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, GoogleCalendarService],
})
export class AppointmentModule {}
