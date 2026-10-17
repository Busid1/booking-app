import { Global, Module } from '@nestjs/common';
import { GoogleCalendarService } from './googleCalendar.service';

@Global()
@Module({
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
