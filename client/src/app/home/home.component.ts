import { Component } from '@angular/core';
import { ServicesComponent } from '../services/services.component';
import { BusinessComponent } from '../business/business.component';
import { CommonModule } from '@angular/common';
import { AppointmentsComponent } from "../dashboard/user/appointments/appointments.component";
import { AuthService } from '../auth/auth.service';
import { ReviewAppointmentsComponent } from "../dashboard/admin/review-appointments/review-appointments.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BusinessComponent, ServicesComponent, CommonModule, AppointmentsComponent, ReviewAppointmentsComponent],
  templateUrl: './home.component.html',
})
export default class HomeComponent {
  constructor(private authService: AuthService) { }

  activeTab: string = 'info';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  isAdmin(){
    return this.authService.isAdmin()
  }
}
