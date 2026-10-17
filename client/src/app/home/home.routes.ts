import { Routes } from '@angular/router';

export default [
    {
        path: '',
        title: 'Bookly · Reserva tu cita online',
        loadComponent: () => import('./home.component'),
    },
] as Routes;
