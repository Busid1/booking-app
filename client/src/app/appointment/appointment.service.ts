import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppointmentInterface } from '../shared/interfaces/appointment.interface';

@Injectable({
    providedIn: 'root'
})

export class AppointmentService {
    protected http = inject(HttpClient);

    createAppointment(appointmentData: AppointmentInterface, token: string): Observable<AppointmentInterface> {
        return this.http.post<AppointmentInterface>(`${environment.apiUrl}/create-appointment`, appointmentData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    getService(): Observable<AppointmentInterface> {
        return this.http.get<AppointmentInterface>(`${environment.apiUrl}/get-appointments`);
    }
}
