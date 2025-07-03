import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./home/home.routes')
    },
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes'),
    },
    {
        path: '',
        loadChildren: () => import('./dashboard/dashboard.routes'),
        canActivate: [AuthGuard],
        canMatch: [AuthGuard]
    },
    {
        path: 'mis-citas',
        loadComponent: () => import('./dashboard/user/appointments/appointments.component').then(m => m.AppointmentsComponent),
    },
    {
        path: '**',
        redirectTo: ''
    },
];
