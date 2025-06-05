import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export default class HeaderComponent {
  constructor(private authService: AuthService) { }
  
  handleIsAuthenticated() {
    return this.authService.isLoggedIn();
  }

  getUserRole() {
    return this.authService.getUserRole();
  }

  logout() {
    return this.authService.logout();
  }
}
