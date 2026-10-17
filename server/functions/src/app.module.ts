import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { BusinessHoursModule } from './business-hours/business-hours.module';
import { AppointmentModule } from './appointment/appointment.module';
import { BusinessInfoModule } from './business-info/business-info.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ServicesModule,
    AuthModule,
    BusinessHoursModule,
    AppointmentModule,
    BusinessInfoModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
