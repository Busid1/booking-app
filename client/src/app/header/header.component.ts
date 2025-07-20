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
  isLoading = false;
  
  handleIsAuthenticated() {
    return this.authService.isLoggedIn();
  }

  isAdmin() {
    return this.authService.isAdmin();
  }

  logout() {
    this.isLoading = true;
    setTimeout(()=>{
      this.isLoading = false;
    }, 1000)
    return this.authService.logout();
  }
}
