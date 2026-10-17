import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../common/app-config';
import { escapeHtml } from '../common/html';

export interface AppointmentEmailData {
  businessName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  clientName: string;
  serviceTitle: string;
  staffName?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  depositPaid?: number | null;
  manageToken?: string | null;
  cancellationHours?: number;
  primaryColor?: string | null;
}

/**
 * Envío de emails transaccionales con Resend (https://resend.com).
 * Si RESEND_API_KEY no está configurada, los envíos se omiten y solo se registran.
 * Nunca lanza errores: un fallo de email no debe romper una reserva.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  get enabled(): boolean {
    return !!process.env.RESEND_API_KEY;
  }

  private get from(): string {
    return process.env.MAIL_FROM || 'Bookly <onboarding@resend.dev>';
  }

  async send(to: string | null | undefined, subject: string, html: string, replyTo?: string | null): Promise<boolean> {
    if (!to) return false;
    if (!this.enabled) {
      this.logger.log(`(email desactivado) "${subject}" → ${to}`);
      return false;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      });
      if (!res.ok) {
        this.logger.error(`Resend respondió ${res.status}: ${await res.text()}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Error enviando email', error as Error);
      return false;
    }
  }

  // ---------- Plantillas ----------

  private formatDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const text = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, d)));
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private money(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  private googleCalendarLink(data: AppointmentEmailData): string {
    const stamp = (time: string) => `${data.date.replace(/-/g, '')}T${time.replace(':', '')}00`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${data.serviceTitle} · ${data.businessName}`,
      dates: `${stamp(data.startTime)}/${stamp(data.endTime)}`,
      ctz: appConfig.timeZone,
      location: data.businessAddress ?? '',
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  private layout(data: AppointmentEmailData, title: string, intro: string, body: string): string {
    const color = /^#[0-9a-f]{6}$/i.test(data.primaryColor ?? '') ? data.primaryColor! : '#4f46e5';
    return `<!doctype html><html lang="es"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#334155">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${color};padding:24px 28px;color:#ffffff">
<div style="font-size:13px;opacity:.85">${escapeHtml(data.businessName)}</div>
<div style="font-size:22px;font-weight:bold;margin-top:4px">${escapeHtml(title)}</div></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 20px;font-size:15px;line-height:1.5">${intro}</p>
${body}
<p style="margin:28px 0 0;font-size:12px;color:#94a3b8;line-height:1.5">${escapeHtml(data.businessName)}${data.businessAddress ? ' · ' + escapeHtml(data.businessAddress) : ''}${data.businessPhone ? ' · ' + escapeHtml(data.businessPhone) : ''}</p>
</td></tr></table></td></tr></table></body></html>`;
  }

  private detailsTable(data: AppointmentEmailData): string {
    const row = (label: string, value: string) =>
      `<tr><td style="padding:8px 0;color:#64748b;font-size:14px">${label}</td><td style="padding:8px 0;text-align:right;font-weight:bold;font-size:14px;color:#0f172a">${value}</td></tr>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">
${row('Servicio', escapeHtml(data.serviceTitle))}
${data.staffName ? row('Con', escapeHtml(data.staffName)) : ''}
${row('Fecha', this.formatDate(data.date))}
${row('Hora', `${data.startTime} – ${data.endTime}`)}
${row('Precio', this.money(data.price))}
${data.depositPaid ? row('Señal pagada', this.money(data.depositPaid)) : ''}
</table>`;
  }

  private button(href: string, label: string, color = '#4f46e5', outline = false): string {
    const style = outline
      ? `border:1px solid #cbd5e1;color:#334155;background:#ffffff`
      : `background:${color};color:#ffffff`;
    return `<a href="${href}" style="display:inline-block;margin:6px 6px 0 0;padding:11px 18px;border-radius:10px;font-weight:bold;font-size:14px;text-decoration:none;${style}">${label}</a>`;
  }

  confirmationEmail(data: AppointmentEmailData) {
    const manageUrl = data.manageToken ? `${appConfig.webUrl}/cita/${data.manageToken}` : `${appConfig.webUrl}/mis-citas`;
    const policy = data.cancellationHours
      ? `<p style="margin:16px 0 0;font-size:13px;color:#64748b">Puedes cancelar hasta ${data.cancellationHours} h antes de la cita.</p>`
      : '';
    const body = `${this.detailsTable(data)}
<div style="margin-top:22px">${this.button(this.googleCalendarLink(data), 'Añadir a mi calendario', data.primaryColor ?? '#4f46e5')}${this.button(manageUrl, 'Ver o cancelar cita', '', true)}</div>${policy}`;
    return {
      subject: `Cita confirmada: ${data.serviceTitle} el ${this.formatDate(data.date)} a las ${data.startTime}`,
      html: this.layout(data, '¡Cita confirmada!', `Hola ${escapeHtml(data.clientName)}, te esperamos. Estos son los detalles de tu reserva:`, body),
    };
  }

  reminderEmail(data: AppointmentEmailData) {
    const manageUrl = data.manageToken ? `${appConfig.webUrl}/cita/${data.manageToken}` : `${appConfig.webUrl}/mis-citas`;
    const body = `${this.detailsTable(data)}<div style="margin-top:22px">${this.button(manageUrl, 'Ver o cancelar cita', '', true)}</div>`;
    return {
      subject: `Recordatorio: tu cita es mañana a las ${data.startTime}`,
      html: this.layout(data, 'Recordatorio de tu cita', `Hola ${escapeHtml(data.clientName)}, te recordamos que tienes una cita próximamente:`, body),
    };
  }

  cancellationEmail(data: AppointmentEmailData) {
    const body = `${this.detailsTable(data)}<div style="margin-top:22px">${this.button(`${appConfig.webUrl}/servicios`, 'Reservar otra cita', data.primaryColor ?? '#4f46e5')}</div>`;
    return {
      subject: `Cita cancelada: ${data.serviceTitle} el ${this.formatDate(data.date)}`,
      html: this.layout(data, 'Cita cancelada', `Hola ${escapeHtml(data.clientName)}, tu cita ha sido cancelada.`, body),
    };
  }

  businessNotification(data: AppointmentEmailData & { clientEmail?: string | null; clientPhone?: string | null }, kind: 'new' | 'cancelled') {
    const contact = [data.clientEmail, data.clientPhone].filter(Boolean).map(v => escapeHtml(v)).join(' · ');
    const body = `${this.detailsTable(data)}${contact ? `<p style="margin:16px 0 0;font-size:14px">Contacto: <strong>${contact}</strong></p>` : ''}
<div style="margin-top:22px">${this.button(`${appConfig.webUrl}/panel`, 'Abrir panel', data.primaryColor ?? '#4f46e5')}</div>`;
    const title = kind === 'new' ? 'Nueva reserva' : 'Reserva cancelada';
    return {
      subject: `${title}: ${data.clientName} · ${this.formatDate(data.date)} ${data.startTime}`,
      html: this.layout(data, title, `${escapeHtml(data.clientName)} ${kind === 'new' ? 'ha reservado' : 'ha cancelado'} una cita.`, body),
    };
  }
}
