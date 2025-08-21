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
        path: '**',
        redirectTo: ''
    },
];
