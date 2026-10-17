import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppointmentInterface, ManagedAppointment } from '../shared/interfaces/appointment.interface';

export interface AppointmentPayload {
    date: string;
    startTime: string;
    serviceId: string;
    endTime?: string;
    staffId?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
    clientPhone?: string | null;
    turnstileToken?: string | null;
}

/** Cliente HTTP de citas. El token se añade automáticamente en el interceptor. */
@Injectable({ providedIn: 'root' })
export class AppointmentService {
    private http = inject(HttpClient);
    private api = environment.apiUrl;

    createAppointment(appointmentData: AppointmentPayload): Observable<AppointmentInterface> {
        return this.http.post<AppointmentInterface>(`${this.api}/create-appointment`, appointmentData);
    }

    updateAppointment(id: string, appointmentData: AppointmentPayload): Observable<AppointmentInterface> {
        return this.http.put<AppointmentInterface>(`${this.api}/update-appointment/${id}`, appointmentData);
    }

    getAppointments(): Observable<AppointmentInterface[]> {
        return this.http.get<AppointmentInterface[]>(`${this.api}/get-appointments`);
    }

    getUserAppointments(): Observable<AppointmentInterface[]> {
        return this.http.get<AppointmentInterface[]>(`${this.api}/get-user-appointments`);
    }

    /** Horas libres para un servicio; staffId puede ser un id, 'any' o vacío. */
    getSlots(date: string, serviceId: string, staffId?: string | null): Observable<{ slots: string[] }> {
        const params: Record<string, string> = { date, serviceId };
        if (staffId) params['staffId'] = staffId;
        return this.http.get<{ slots: string[] }>(`${this.api}/availability/slots`, { params });
    }

    deleteAppointment(id: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/delete-appointment`, { body: { id } });
    }

    syncFromGoogle(): Observable<{ synced: boolean; removed: number }> {
        return this.http.patch<{ synced: boolean; removed: number }>(`${this.api}/sync-from-google`, {});
    }

    // --- Gestión con código (sin cuenta)

    getManaged(token: string): Observable<ManagedAppointment> {
        return this.http.get<ManagedAppointment>(`${this.api}/appointments/manage/${encodeURIComponent(token)}`);
    }

    getManagedBatch(tokens: string[]): Observable<ManagedAppointment[]> {
        return this.http.post<ManagedAppointment[]>(`${this.api}/appointments/manage/batch`, { tokens });
    }

    cancelManaged(token: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/appointments/manage/${encodeURIComponent(token)}`);
    }
}
