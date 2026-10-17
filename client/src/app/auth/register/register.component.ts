import { Component, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { alerts, getErrorMessage } from '../../shared/services/alerts';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthLayoutComponent],
})
export default class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Input() returnUrl = '';

  formData = { name: '', email: '', password: '' };
  readonly error = signal('');
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);

  passwordStrength(): number {
    const p = this.formData.password;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  async submitForm() {
    if (this.isLoading()) return;
    this.error.set('');
    this.isLoading.set(true);

    try {
      await firstValueFrom(
        this.authService.registerUser(this.formData.email, this.formData.password, this.formData.name),
      );
      alerts.success('¡Cuenta creada!', 'Ya puedes reservar tu cita.');
      const target = this.returnUrl?.startsWith('/') && !this.returnUrl.startsWith('//') ? this.returnUrl : '/servicios';
      this.router.navigateByUrl(target);
    } catch (error) {
      this.error.set(getErrorMessage(error, 'No se ha podido crear la cuenta'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
