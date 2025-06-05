import { Routes } from "@angular/router";

export default [
    { 
        path: '', 
        loadComponent: () => import('./home.component'), 
    },
    {
        path: 'pedir-cita',
        loadComponent: () => import('../calendar/calendar.component'),
    }
] as Routes;