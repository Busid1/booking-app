/** Configuración leída de variables de entorno, centralizada. */
export const appConfig = {
  get webUrl(): string {
    return (process.env.PUBLIC_WEB_URL || 'https://bookly-39896.web.app').replace(/\/$/, '');
  },
  get timeZone(): string {
    return process.env.BUSINESS_TIMEZONE || 'Europe/Madrid';
  },
  get turnstileSiteKey(): string {
    return process.env.TURNSTILE_SITE_KEY || '';
  },
  get turnstileSecret(): string {
    return process.env.TURNSTILE_SECRET_KEY || '';
  },
  get cronSecret(): string {
    return process.env.CRON_SECRET || '';
  },
};
