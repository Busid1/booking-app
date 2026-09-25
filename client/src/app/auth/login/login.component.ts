import { Component, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { alerts, getErrorMessage } from '../../shared/services/alerts';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthLayoutComponent],
})
export default class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  /** Query params enlazados por el router (withComponentInputBinding). */
  @Input() returnUrl = '';
  @Input() expired = '';

  formData = { email: '', password: '' };
  readonly error = signal('');
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);

  async submitForm() {
    if (this.isLoading()) return;
    this.error.set('');
    this.isLoading.set(true);

    try {
      await firstValueFrom(this.authService.loginUser(this.formData.email, this.formData.password));
      alerts.success(`¡Hola de nuevo, ${this.authService.firstName()}!`);
      this.router.navigateByUrl(this.safeReturnUrl());
    } catch (error) {
      this.error.set(getErrorMessage(error, 'No se ha podido iniciar sesión'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private safeReturnUrl(): string {
    return this.returnUrl?.startsWith('/') && !this.returnUrl.startsWith('//') ? this.returnUrl : '/';
  }
}
