import { Controller, Get } from '@nestjs/common';
import { appConfig } from '../common/app-config';
import { MailService } from '../mail/mail.service';
import { StripeService } from '../payments/stripe.service';
import { GoogleCalendarService } from '../google-calendar/googleCalendar.service';

/** Configuración pública que necesita la web (sin secretos). */
@Controller('config')
export class PublicConfigController {
  constructor(
    private readonly mail: MailService,
    private readonly stripe: StripeService,
    private readonly calendar: GoogleCalendarService,
  ) {}

  @Get()
  get() {
    return {
      turnstileSiteKey: appConfig.turnstileSiteKey || null,
      payments: this.stripe.enabled,
      email: this.mail.enabled,
      googleCalendar: this.calendar.enabled,
      timeZone: appConfig.timeZone,
    };
  }
}
