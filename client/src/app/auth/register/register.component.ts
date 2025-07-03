import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  standalone: true,
})

export default class RegisterComponent {
  constructor(private authService: AuthService) { }

  formData = {
    email: '',
    password: '',
    name: '',
  }

  handleInputChange(field: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.formData[field as 'email' | 'password' | 'name'] = value
  }

  async submitForm(event: Event) {
    event.preventDefault();
    const { email, password, name } = this.formData;

    try {
      const response: any = await firstValueFrom(this.authService.registerUser(email, password, name));
      console.log(response);
      
      const token = response.authToken;
      const role = response.role;

      localStorage.setItem('authToken', token);
      localStorage.setItem('role', role);
      this.authService.login();
      alert('Usuario registrado');
    } catch (error) {
      console.log(error);
      alert('Error al registrar el usuario');
    }
  }
}
