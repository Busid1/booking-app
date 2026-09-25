import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: 'admin' | 'user' | string;
  exp?: number;
}

interface AuthResponse {
  authToken: string;
  role: string;
}

const TOKEN_KEY = 'authToken';
const ROLE_KEY = 'role';

function decodeToken(token: string | null): SessionUser | null {
  if (!token) return null;
  try {
    const payload = jwtDecode<SessionUser>(token);
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly tokenSignal = signal<string | null>(this.readStoredToken());

  readonly token = this.tokenSignal.asReadonly();
  readonly user = computed(() => decodeToken(this.tokenSignal()));
  readonly isLoggedInSignal = computed(() => this.user() !== null);
  readonly isAdminSignal = computed(() => this.user()?.role === 'admin');
  readonly firstName = computed(() => (this.user()?.name || this.user()?.email || '').split(/[\s@]/)[0]);

  private readStoredToken(): string | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && !decodeToken(token)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        return null;
      }
      return token;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    // Revalida la expiración en cada consulta para no mostrar sesiones caducadas.
    if (this.tokenSignal() && !decodeToken(this.tokenSignal())) this.clearSession();
    return this.isLoggedInSignal();
  }

  isAdmin(): boolean {
    return this.isLoggedIn() && this.isAdminSignal();
  }

  private storeSession(response: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, response.authToken);
    localStorage.setItem(ROLE_KEY, response.role);
    this.tokenSignal.set(response.authToken);
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    this.tokenSignal.set(null);
  }

  loginUser(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email: email.trim(), password })
      .pipe(tap(res => this.storeSession(res)));
  }

  registerUser(email: string, password: string, name: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, { email: email.trim(), password, name: name.trim() })
      .pipe(tap(res => this.storeSession(res)));
  }

  logout(redirectTo: string | null = '/'): void {
    this.clearSession();
    if (redirectTo !== null) this.router.navigateByUrl(redirectTo);
  }
}
