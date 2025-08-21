import { Component, OnInit } from '@angular/core';
import BusinessCardComponent from './business-card/business-card.component';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-business',
  standalone: true,
  imports: [BusinessCardComponent],
  templateUrl: './business.component.html',
})

export class BusinessComponent {
  constructor(private authService: AuthService) { }
  isClosePopup: boolean = false;

  isAdmin() {
    return this.authService.isAdmin();
  }

  closePopup(){
    this.isClosePopup = true;
  }
}