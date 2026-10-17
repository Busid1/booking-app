import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { BusinessHoursModule } from './business-hours/business-hours.module';
import { AppointmentModule } from './appointment/appointment.module';
import { BusinessInfoModule } from './business-info/business-info.module';
import { PrismaModule } from './prisma/prisma.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { MailModule } from './mail/mail.module';
import { PaymentsModule } from './payments/payments.module';
import { StaffModule } from './staff/staff.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PublicConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GoogleCalendarModule,
    SchedulingModule,
    MailModule,
    PaymentsModule,
    StaffModule,
    ReviewsModule,
    PublicConfigModule,
    ServicesModule,
    AuthModule,
    BusinessHoursModule,
    AppointmentModule,
    BusinessInfoModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
