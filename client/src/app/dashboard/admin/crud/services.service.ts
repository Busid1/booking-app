import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ServiceInterface } from '../../../shared/interfaces/service.interface';
import { BusinessHoursInterface } from '../../../shared/interfaces/business-hours.interface';
import { BusinessInfoInterface, PublicConfig } from '../../../shared/interfaces/business-info.interface';
import { StaffAdmin, StaffInterface, StaffPayload } from '../../../shared/interfaces/staff.interface';
import { AdminReview, ReviewsSummary } from '../../../shared/interfaces/review.interface';

/** Cliente HTTP para servicios, horario, información del negocio, equipo y reseñas. */
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

    reorderServices(ids: string[]): Observable<ServiceInterface[]> {
        return this.http.put<ServiceInterface[]>(`${this.api}/services/reorder`, { ids });
    }

    saveBusinessInfo(businessInfo: Omit<BusinessInfoInterface, 'images' | 'logo'>): Observable<BusinessInfoInterface> {
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

    uploadLogo(file: File): Observable<BusinessInfoInterface> {
        const formData = new FormData();
        formData.append('logo', file);
        return this.http.post<BusinessInfoInterface>(`${this.api}/business-info/logo`, formData);
    }

    removeLogo(): Observable<BusinessInfoInterface> {
        return this.http.delete<BusinessInfoInterface>(`${this.api}/business-info/logo`);
    }

    getConfig(): Observable<PublicConfig> {
        return this.http.get<PublicConfig>(`${this.api}/config`);
    }

    // --- Equipo

    getStaff(): Observable<StaffInterface[]> {
        return this.http.get<StaffInterface[]>(`${this.api}/staff`);
    }

    getStaffAdmin(): Observable<StaffAdmin[]> {
        return this.http.get<StaffAdmin[]>(`${this.api}/staff/all`);
    }

    createStaff(data: StaffPayload): Observable<StaffAdmin> {
        return this.http.post<StaffAdmin>(`${this.api}/staff`, data);
    }

    updateStaff(id: string, data: StaffPayload): Observable<StaffAdmin> {
        return this.http.put<StaffAdmin>(`${this.api}/staff/${id}`, data);
    }

    uploadStaffPhoto(id: string, file: File): Observable<StaffAdmin> {
        const formData = new FormData();
        formData.append('photo', file);
        return this.http.post<StaffAdmin>(`${this.api}/staff/${id}/photo`, formData);
    }

    removeStaffPhoto(id: string): Observable<StaffAdmin> {
        return this.http.delete<StaffAdmin>(`${this.api}/staff/${id}/photo`);
    }

    deleteStaff(id: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/staff/${id}`);
    }

    // --- Reseñas

    getReviews(): Observable<ReviewsSummary> {
        return this.http.get<ReviewsSummary>(`${this.api}/reviews`);
    }

    getAllReviews(): Observable<AdminReview[]> {
        return this.http.get<AdminReview[]>(`${this.api}/reviews/all`);
    }

    createReview(data: { rating: number; comment?: string; appointmentId?: string; manageToken?: string }): Observable<unknown> {
        return this.http.post(`${this.api}/reviews`, data);
    }

    setReviewVisible(id: string, visible: boolean): Observable<unknown> {
        return this.http.patch(`${this.api}/reviews/${id}`, { visible });
    }

    deleteReview(id: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/reviews/${id}`);
    }
}
