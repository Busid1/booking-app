import { Routes } from '@angular/router';
import { guestGuard } from './auth.guard';

export default [
    {
        path: 'login',
        title: 'Iniciar sesión · Bookly',
        canActivate: [guestGuard],
        loadComponent: () => import('./login/login.component'),
    },
    {
        path: 'register',
        title: 'Crear cuenta · Bookly',
        canActivate: [guestGuard],
        loadComponent: () => import('./register/register.component'),
    },
    { path: '', pathMatch: 'full', redirectTo: 'login' },
] as Routes;
