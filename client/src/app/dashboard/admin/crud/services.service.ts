import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ServiceInterface } from '../../../shared/interfaces/service.interface';
import { BusinessHoursInterface } from '../../../shared/interfaces/business-hours.interface';
import { BusinessInfoInterface } from '../../../shared/interfaces/business-info.interface';

/** Cliente HTTP para servicios, horario e información del negocio. */
@Injectable({ providedIn: 'root' })
export class ServicesService {
    private http = inject(HttpClient);
    private api = environment.apiUrl;

    getServices(): Observable<ServiceInterface[]> {
        return this.http.get<ServiceInterface[]>(`${this.api}/services/all-services`);
    }

    getService(id: string): Observable<ServiceInterface> {
        return this.http.get<ServiceInterface>(`${this.api}/services/get-service/${id}`);
    }

    createService(serviceFormData: FormData): Observable<ServiceInterface> {
        return this.http.post<ServiceInterface>(`${this.api}/services/create-service`, serviceFormData);
    }

    updateService(serviceId: string, serviceFormData: FormData): Observable<ServiceInterface> {
        return this.http.put<ServiceInterface>(`${this.api}/services/update-service/${serviceId}`, serviceFormData);
    }

    deleteService(id: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/services/delete-service/${id}`);
    }

    saveBusinessHours(businessHours: BusinessHoursInterface[]): Observable<BusinessHoursInterface[]> {
        return this.http.post<BusinessHoursInterface[]>(`${this.api}/business-hours/save`, businessHours);
    }

    getBusinessHours(): Observable<BusinessHoursInterface[]> {
        return this.http.get<BusinessHoursInterface[]>(`${this.api}/business-hours/get`);
    }

    saveBusinessInfo(businessInfo: Omit<BusinessInfoInterface, 'images'>): Observable<BusinessInfoInterface> {
        return this.http.post<BusinessInfoInterface>(`${this.api}/business-info/save`, businessInfo);
    }

    deleteBusinessImage(imageUrl: string): Observable<BusinessInfoInterface> {
        return this.http.delete<BusinessInfoInterface>(`${this.api}/business-info/delete-image`, { params: { url: imageUrl } });
    }

    uploadImages(files: File[]): Observable<BusinessInfoInterface> {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));
        return this.http.post<BusinessInfoInterface>(`${this.api}/business-info/images`, formData);
    }

    getBusinessInfo(): Observable<BusinessInfoInterface[]> {
        return this.http.get<BusinessInfoInterface[]>(`${this.api}/business-info/get`);
    }
}
