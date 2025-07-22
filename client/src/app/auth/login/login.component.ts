import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
})

export default class LoginComponent {
  constructor(private authService: AuthService) { }

  formData = {
    email: '',
    password: '',
    error: ''
  };

  isLoading = false;

  handleInputChange(field: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.formData[field as "email" | "password"] = value;
  }

  async submitForm(event: Event) {
    event.preventDefault();
    const { email, password } = this.formData;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(this.authService.loginUser(email, password));
      const token = response.authToken;
      const role = response.role;

      localStorage.setItem("authToken", token);
      localStorage.setItem('role', role);
      this.authService.login();
    } catch (error: any) {
      this.formData.error = error.error.message
    } finally {
      this.isLoading = false
    }
  }

}
