import { Routes } from "@angular/router";

export default [
    { 
        path: '', 
        loadComponent: () => import('./home.component'), 
    }
] as Routes;