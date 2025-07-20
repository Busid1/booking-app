import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode'
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})

export class AuthService{
    protected http = inject(HttpClient);
    private isAuthenticated = this.handleIsAuthenticated();
    private router: Router;

    constructor(router: Router) {
        this.router = router;
    }

    handleIsAuthenticated() {
        if (localStorage.getItem("authToken")) {
            return true
        }
        return false
    }

    isLoggedIn(): boolean {
        return this.isAuthenticated;
    }

    login(): void {
        if (localStorage.getItem("authToken")) {
            this.isAuthenticated = true;
            this.router.navigate(['/']);
        }
    }

    logout(): void {
        this.isAuthenticated = false;
        localStorage.removeItem("authToken")
        localStorage.removeItem("role")
    }

    isAdmin() {
        const token = localStorage.getItem("authToken");
        if (!token) return null;

        const decoded: any = jwtDecode(token);
        if (decoded.role === "user") {
            return false
        }
        return true;
    }

    loginUser(email: string, password: string) {
        return this.http.post(`${environment.apiUrl}/auth/login`, { email, password }, { withCredentials: true });
    }

    registerUser(email: string, password: string, name: string) {
        return this.http.post(`${environment.apiUrl}/auth/register`, { email, password, name }, { withCredentials: true });
    }
}