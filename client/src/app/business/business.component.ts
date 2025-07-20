import { Component, OnInit } from '@angular/core';
import BusinessCardComponent from './business-card/business-card.component';
import { BusinessHoursComponent } from './business-hours/business-hours.component';
import { AuthService } from '../auth/auth.service';
import { ServicesComponent } from "../services/services.component";

@Component({
  selector: 'app-business',
  standalone: true,
  imports: [BusinessCardComponent, BusinessHoursComponent, ServicesComponent],
  templateUrl: './business.component.html',
})

export class BusinessComponent {
  constructor(private authService: AuthService) { }

  isAdmin() {
    return this.authService.isAdmin();
  }
}