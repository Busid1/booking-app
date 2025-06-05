import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [RouterLink],
  standalone: true,
})

export default class LoginComponent {
  constructor(private authService: AuthService) { }

  formData = {
    email: '',
    password: ''
  };

  handleInputChange(field: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.formData[field as "email" | "password"] = value;
  }

  async submitForm(event: Event) {
    event.preventDefault();
    const { email, password } = this.formData;

    try {
      const response: any = await firstValueFrom(this.authService.loginUser(email, password));
      const token = response.authToken;
      const role = response.role;

      localStorage.setItem("authToken", token);
      localStorage.setItem('role', role);
      this.authService.login();
      alert('Bienvenido de nuevo');
    } catch (error) {
      console.error('Login failed', error);
    }
  }

}
