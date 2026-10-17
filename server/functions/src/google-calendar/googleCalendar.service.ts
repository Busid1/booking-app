import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { google } from 'googleapis';

export interface CalendarEventData {
    summary: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    duration: number;
    client: string;
    service: string;
    staff?: string | null;
    contact?: string | null;
}

/**
 * Sincronización opcional con Google Calendar. Si no hay credenciales configuradas,
 * todas las operaciones son no-op y la app sigue funcionando con normalidad.
 * Los errores de Google nunca bloquean la gestión de citas: solo se registran.
 */
@Injectable()
export class GoogleCalendarService {
    private readonly logger = new Logger(GoogleCalendarService.name);
    private calendar: any = null;
    private readonly timeZone = process.env.BUSINESS_TIMEZONE || 'Europe/Madrid';
    /** Email de la cuenta de servicio: es con quien hay que compartir el calendario. */
    serviceAccountEmail: string | null = null;

    constructor(private readonly prisma: PrismaService) {
        const jsonCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        if (!jsonCredentials) {
            this.logger.warn('GOOGLE_SERVICE_ACCOUNT_JSON no está definida: sincronización con Google Calendar desactivada');
            return;
        }

        try {
            const credentials = JSON.parse(jsonCredentials);
            this.serviceAccountEmail = credentials.client_email ?? null;
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/calendar'],
            });
            this.calendar = google.calendar({ version: 'v3', auth });
        } catch (err) {
            this.logger.error('Credenciales de Google Calendar inválidas; sincronización desactivada', err as Error);
        }
    }

    /**
     * Calendario a usar: el del profesional, el configurado en la web (Información → Reservas)
     * o la variable GOOGLE_CALENDAR_ID. Si no hay ninguno, no se sincroniza.
     */
    async resolveCalendarId(calendarId?: string | null): Promise<string | null> {
        if (calendarId) return calendarId;
        const info = await this.prisma.businessInfo.findUnique({ where: { id: 1 }, select: { googleCalendarId: true } });
        return info?.googleCalendarId || process.env.GOOGLE_CALENDAR_ID || null;
    }

    get enabled(): boolean {
        return this.calendar !== null;
    }

    private buildEvent(data: CalendarEventData) {
        return {
            summary: data.summary,
            description: [
                `Cliente: ${data.client}`,
                data.contact ? `Contacto: ${data.contact}` : '',
                `Servicio: ${data.service}`,
                data.staff ? `Profesional: ${data.staff}` : '',
                `Precio: ${data.price}€`,
                `Duración: ${data.duration} min`,
            ].filter(Boolean).join('\n'),
            start: { dateTime: `${data.date}T${data.startTime}:00`, timeZone: this.timeZone },
            end: { dateTime: `${data.date}T${data.endTime}:00`, timeZone: this.timeZone },
        };
    }

    /** Crea el evento y devuelve su id, o null si no se pudo crear. */
    async createEvent(data: CalendarEventData, calendarId?: string | null): Promise<string | null> {
        if (!this.enabled) return null;
        const target = await this.resolveCalendarId(calendarId);
        if (!target) return null;
        try {
            const res = await this.calendar.events.insert({
                calendarId: target,
                requestBody: this.buildEvent(data),
            });
            return res.data.id ?? null;
        } catch (err) {
            this.logger.error('Error al crear evento en Google Calendar', err as Error);
            return null;
        }
    }

    /** Actualiza el evento; si no existe (o no había id) lo crea. Devuelve el id resultante. */
    async upsertEvent(eventId: string | null, data: CalendarEventData, calendarId?: string | null): Promise<string | null> {
        if (!this.enabled) return eventId;
        if (!eventId) return this.createEvent(data, calendarId);
        const target = await this.resolveCalendarId(calendarId);
        if (!target) return eventId;
        try {
            const res = await this.calendar.events.update({
                calendarId: target,
                eventId,
                requestBody: this.buildEvent(data),
            });
            return res.data.id ?? eventId;
        } catch (err: any) {
            if (err?.code === 404 || err?.code === 410) return this.createEvent(data, calendarId);
            this.logger.error('Error al actualizar evento en Google Calendar', err as Error);
            return eventId;
        }
    }

    async deleteEvent(eventId: string | null | undefined, calendarId?: string | null): Promise<void> {
        if (!this.enabled || !eventId) return;
        const target = await this.resolveCalendarId(calendarId);
        if (!target) return;
        try {
            await this.calendar.events.delete({ calendarId: target, eventId });
        } catch (err: any) {
            if (err?.code === 404 || err?.code === 410) return;
            this.logger.error('Error al borrar evento de Google Calendar', err as Error);
        }
    }

    /** Devuelve los ids de los eventos a partir de timeMin, o null si no se pudo consultar. */
    async listEventIds(timeMin: Date, calendarId?: string | null): Promise<Set<string> | null> {
        if (!this.enabled) return null;
        const target = await this.resolveCalendarId(calendarId);
        if (!target) return null;
        const ids = new Set<string>();
        let pageToken: string | undefined;
        try {
            do {
                const res = await this.calendar.events.list({
                    calendarId: target,
                    timeMin: timeMin.toISOString(),
                    maxResults: 2500,
                    singleEvents: true,
                    pageToken,
                });
                for (const ev of res.data.items ?? []) if (ev.id) ids.add(ev.id);
                pageToken = res.data.nextPageToken ?? undefined;
            } while (pageToken);
            return ids;
        } catch (err) {
            this.logger.error('Error al listar eventos de Google Calendar', err as Error);
            return null;
        }
    }
}
