import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppointmentInterface, BusySlot } from '../shared/interfaces/appointment.interface';

export type AppointmentPayload = Pick<AppointmentInterface, 'date' | 'startTime' | 'serviceId'> & {
    endTime?: string;
    clientName?: string | null;
};

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

    /** Franjas ocupadas de un día, sin datos personales. */
    getAvailability(date: string): Observable<BusySlot[]> {
        return this.http.get<BusySlot[]>(`${this.api}/availability`, { params: { date } });
    }

    deleteAppointment(id: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/delete-appointment`, { body: { id } });
    }

    syncFromGoogle(): Observable<{ synced: boolean; removed: number }> {
        return this.http.patch<{ synced: boolean; removed: number }>(`${this.api}/sync-from-google`, {});
    }
}
