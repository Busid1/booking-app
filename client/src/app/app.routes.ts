import { Routes } from '@angular/router';
import { adminGuard, staffGuard } from './auth/auth.guard';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./home/home.routes'),
    },
    {
        path: 'servicios',
        title: 'Servicios · Reserva online',
        loadComponent: () => import('./services/services.component').then(m => m.ServicesComponent),
    },
    {
        path: 'reservar/:slug',
        title: 'Reservar cita',
        loadComponent: () => import('./services/services.component').then(m => m.ServicesComponent),
    },
    {
        path: 'mis-citas',
        title: 'Mis citas',
        loadComponent: () => import('./dashboard/user/appointments/appointments.component').then(m => m.AppointmentsComponent),
    },
    {
        path: 'cita/:token',
        title: 'Tu cita',
        loadComponent: () => import('./manage/manage-appointment.component'),
    },
    {
        path: 'panel',
        title: 'Panel',
        canActivate: [staffGuard],
        loadComponent: () => import('./dashboard/admin/panel/panel-layout.component'),
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./dashboard/admin/review-appointments/review-appointments.component').then(m => m.ReviewAppointmentsComponent),
            },
            {
                path: 'equipo',
                title: 'Equipo · Panel',
                canActivate: [adminGuard],
                loadComponent: () => import('./dashboard/admin/team/team.component'),
            },
            {
                path: 'resenas',
                title: 'Reseñas · Panel',
                canActivate: [adminGuard],
                loadComponent: () => import('./dashboard/admin/reviews-admin/reviews-admin.component'),
            },
        ],
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
