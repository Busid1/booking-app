import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './googleCalendar.service';

@Module({
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
