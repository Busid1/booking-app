import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [PrismaModule, GoogleCalendarModule],
  controllers: [AppointmentController],
  providers: [AppointmentService],
})
export class AppointmentModule {}
