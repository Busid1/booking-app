import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/** Añade el token JWT a las peticiones a la API y cierra la sesión si el servidor la rechaza. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const authReq = token && isApiRequest && !req.headers.has('Authorization')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      if (error.status === 401 && token && !isAuthEndpoint) {
        auth.logout(null);
        router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url, expired: 1 } });
      }
      return throwError(() => error);
    }),
  );
};
