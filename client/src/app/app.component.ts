import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import HeaderComponent from './header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Bookly';

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp;
      const now = Math.floor(Date.now() / 1000);
      return now > expiry;
    } catch {
      return true; // si falla el decode, lo damos por inválido
    }
  }

  ngOnInit() {
    const token = localStorage.getItem('authToken');
    if (token && this.isTokenExpired(token)) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('role'); 
    }
  }
}
