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

    getAppointments(): Observable<AppointmentInterface[]> {
        return this.http.get<AppointmentInterface[]>(`${environment.apiUrl}/get-appointments`);
    }

    getUserAppointments(): Observable<AppointmentInterface> {
        return this.http.get<AppointmentInterface>(`${environment.apiUrl}/get-user-appointments`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`
            }
        });
    }

    deleteAppointment(id: string): Observable<void> {
        return this.http.delete<void>(`${environment.apiUrl}/delete-appointment`, {
            body: { id: id }
        });
    }

    syncFromGoogle(): Observable<void> {
        return this.http.patch<void>(`${environment.apiUrl}/sync-from-google`, {});
    }

    updateAppointment(appointmentData: AppointmentInterface, token: string, id: string): Observable<AppointmentInterface>{
        return this.http.put<AppointmentInterface>(`${environment.apiUrl}/update-appointment/${id}`, appointmentData, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    }

}
