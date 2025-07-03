import { Routes } from "@angular/router";

export default [
    {
        path: "revisar-citas",
        loadComponent: () => import('./admin/review-appointments/review-appointments.component').then(m => m.ReviewAppointmentsComponent)    
    }
] as Routes