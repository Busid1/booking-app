import { Injectable } from '@angular/core';
import { CanActivate, CanMatch, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanMatch {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }

  canMatch(): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}
