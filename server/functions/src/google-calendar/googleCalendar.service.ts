import { Injectable, Logger } from '@nestjs/common';
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
    private readonly calendarId = process.env.GOOGLE_CALENDAR_ID || 'primexd214@gmail.com';
    private readonly timeZone = process.env.BUSINESS_TIMEZONE || 'Europe/Madrid';

    constructor() {
        const jsonCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        if (!jsonCredentials) {
            this.logger.warn('GOOGLE_SERVICE_ACCOUNT_JSON no está definida: sincronización con Google Calendar desactivada');
            return;
        }

        try {
            const auth = new google.auth.GoogleAuth({
                credentials: JSON.parse(jsonCredentials),
                scopes: ['https://www.googleapis.com/auth/calendar'],
            });
            this.calendar = google.calendar({ version: 'v3', auth });
        } catch (err) {
            this.logger.error('Credenciales de Google Calendar inválidas; sincronización desactivada', err as Error);
        }
    }

    get enabled(): boolean {
        return this.calendar !== null;
    }

    private buildEvent(data: CalendarEventData) {
        return {
            summary: data.summary,
            description: `Cliente: ${data.client}\nServicio: ${data.service}\nPrecio: ${data.price}€\nDuración: ${data.duration} min`,
            start: { dateTime: `${data.date}T${data.startTime}:00`, timeZone: this.timeZone },
            end: { dateTime: `${data.date}T${data.endTime}:00`, timeZone: this.timeZone },
        };
    }

    /** Crea el evento y devuelve su id, o null si no se pudo crear. */
    async createEvent(data: CalendarEventData): Promise<string | null> {
        if (!this.enabled) return null;
        try {
            const res = await this.calendar.events.insert({
                calendarId: this.calendarId,
                requestBody: this.buildEvent(data),
            });
            return res.data.id ?? null;
        } catch (err) {
            this.logger.error('Error al crear evento en Google Calendar', err as Error);
            return null;
        }
    }

    /** Actualiza el evento; si no existe (o no había id) lo crea. Devuelve el id resultante. */
    async upsertEvent(eventId: string | null, data: CalendarEventData): Promise<string | null> {
        if (!this.enabled) return eventId;
        if (!eventId) return this.createEvent(data);
        try {
            const res = await this.calendar.events.update({
                calendarId: this.calendarId,
                eventId,
                requestBody: this.buildEvent(data),
            });
            return res.data.id ?? eventId;
        } catch (err: any) {
            if (err?.code === 404 || err?.code === 410) return this.createEvent(data);
            this.logger.error('Error al actualizar evento en Google Calendar', err as Error);
            return eventId;
        }
    }

    async deleteEvent(eventId: string | null | undefined): Promise<void> {
        if (!this.enabled || !eventId) return;
        try {
            await this.calendar.events.delete({ calendarId: this.calendarId, eventId });
        } catch (err: any) {
            if (err?.code === 404 || err?.code === 410) return;
            this.logger.error('Error al borrar evento de Google Calendar', err as Error);
        }
    }

    /** Devuelve los ids de los eventos a partir de timeMin, o null si no se pudo consultar. */
    async listEventIds(timeMin: Date): Promise<Set<string> | null> {
        if (!this.enabled) return null;
        const ids = new Set<string>();
        let pageToken: string | undefined;
        try {
            do {
                const res = await this.calendar.events.list({
                    calendarId: this.calendarId,
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
