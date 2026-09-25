import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './auth/auth.guard';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./home/home.routes'),
    },
    {
        path: 'servicios',
        title: 'Servicios · Bookly',
        loadComponent: () => import('./services/services.component').then(m => m.ServicesComponent),
    },
    {
        path: 'mis-citas',
        title: 'Mis citas · Bookly',
        canActivate: [authGuard],
        loadComponent: () => import('./dashboard/user/appointments/appointments.component').then(m => m.AppointmentsComponent),
    },
    {
        path: 'panel',
        title: 'Panel de administración · Bookly',
        canActivate: [adminGuard],
        loadComponent: () =>
            import('./dashboard/admin/review-appointments/review-appointments.component').then(m => m.ReviewAppointmentsComponent),
    },
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes'),
    },
    {
        path: '**',
        redirectTo: '',
    },
];
