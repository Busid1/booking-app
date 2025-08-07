import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleCalendarService {
    private calendar: any;
    private calendarId = 'primexd214@gmail.com';

    constructor() {
        const jsonCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        if (!jsonCredentials) {
            throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no está definida en las variables de entorno');
        }

        const credentials = JSON.parse(jsonCredentials);

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        this.calendar = google.calendar({ version: 'v3', auth });
    }

    async createEvent({
        summary,
        startDateTime,
        endDateTime,
        price,
        duration,
        client,
        service,
    }: {
        summary: string;
        startDateTime: string;
        endDateTime: string;
        price: number;
        duration: number;
        client: string;
        service: string;
    }) {
        const fixDateTime = (dt: string) => dt.length === 16 ? dt + ':00' : dt;

        const event = {
            summary,
            description: `Cliente: ${client}\nServicio: ${service}\nPrecio: ${price}€\nDuración: ${duration} min`,
            start: {
                dateTime: fixDateTime(startDateTime),
                timeZone: 'Europe/Madrid',
            },
            end: {
                dateTime: fixDateTime(endDateTime),
                timeZone: 'Europe/Madrid',
            },
        };

        try {
            const res = await this.calendar.events.insert({
                calendarId: this.calendarId,
                resource: event,
            });
            return res.data;
        } catch (err) {
            console.error(err);
            throw new InternalServerErrorException(
                'Error al crear evento en Google Calendar',
            );
        }
    }

    async updateEvent(
        {
            summary,
            eventId,
            startDateTime,
            endDateTime,
            price,
            duration,
            client,
            service,
        }
        : 
        {
            summary: string;
            eventId: string;
            startDateTime: string;
            endDateTime: string;
            price: number;
            duration: number;
            client: string;
            service: string;
        }
    ) {
        const fixDateTime = (dt: string) => dt.length === 16 ? dt + ':00' : dt;

        const event = {
            summary,
            description: `Cliente: ${client}\nServicio: ${service}\nPrecio: ${price}€\nDuración: ${duration} min`,
            start: {
                dateTime: fixDateTime(startDateTime),
                timeZone: 'Europe/Madrid',
            },
            end: {
                dateTime: fixDateTime(endDateTime),
                timeZone: 'Europe/Madrid',
            },
        };
        try {
            const res = await this.calendar.events.update({
                calendarId: this.calendarId,
                eventId,
                resource: event,
            })

            res.data
        } catch (error) {
            console.log(error)
        }
    }

    async deleteEvent(googleEventId: string, calendarId: string) {
        try {
            await this.calendar.events.delete({
                calendarId,
                eventId: googleEventId,
            });
            return { success: true };
        } catch (err) {
            console.error('Error al borrar el evento de Google Calendar', err);
            throw new InternalServerErrorException('Error al borrar evento en Google Calendar');
        }
    }

    async listEvents(timeMin?: string, timeMax?: string) {
        const params: any = {
            calendarId: this.calendarId,
            maxResults: 2500,
            singleEvents: true,
            orderBy: 'startTime',
        };

        if (timeMin) params.timeMin = timeMin;
        else params.timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // última semana

        if (timeMax) params.timeMax = timeMax;

        try {
            const res = await this.calendar.events.list(params);
            return res.data.items || [];
        } catch (err) {
            console.error(err);
            throw new InternalServerErrorException('Error al listar eventos de Google Calendar');
        }
    }

}
