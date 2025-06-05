import { Routes } from "@angular/router";

export default [
    {
        path: "",
        loadComponent: () => import('./crud/create-product/create-product.component')
    }
 ] as Routes