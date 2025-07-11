import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ServiceInterface } from '../../../shared/interfaces/service.interface';
import { Observable } from 'rxjs';
import { BusinessHoursInterface } from '../../../shared/interfaces/business-hours.interface';

@Injectable({
    providedIn: 'root'
})

export class ServicesService {
    protected http = inject(HttpClient);

    getServices(): Observable<ServiceInterface[]> {
        return this.http.get<ServiceInterface[]>(`${environment.apiUrl}/services/all-services`)
    }

    getService(id: string): Observable<ServiceInterface> {
        return this.http.get<ServiceInterface>(`${environment.apiUrl}/services/get-service/${id}`);
    }

    createService(serviceFormData: FormData): Observable<ServiceInterface> {
        return this.http.post<ServiceInterface>(`${environment.apiUrl}/services/create-service`, serviceFormData);
    }

    updateService(serviceId: string, serviceFormData: FormData): Observable<ServiceInterface> {
        return this.http.put<ServiceInterface>(`${environment.apiUrl}/services/update-service/${serviceId}`, serviceFormData);
    }

    deleteService(id: string): Observable<void> {
        return this.http.delete<void>(`${environment.apiUrl}/services/delete-service/${id}`);
    }

    saveBusinessHours(businessHours: BusinessHoursInterface[]): Observable<BusinessHoursInterface> {
        return this.http.post<BusinessHoursInterface>(`${environment.apiUrl}/business-hours/save`, businessHours);
    }

    getBusinessHours(): Observable<BusinessHoursInterface[]>{
        return this.http.get<BusinessHoursInterface[]>(`${environment.apiUrl}/business-hours/get`);
    }
}
