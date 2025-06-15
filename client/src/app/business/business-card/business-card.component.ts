import { Component } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { AdminButtonsComponent } from '../../admin/admin-buttons/admin-buttons.component';

@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [AdminButtonsComponent],
  templateUrl: './business-card.component.html',
  styleUrls: [],
})
export default class BusinessCardComponent{
  constructor(private authService: AuthService) { }
  
  isAdmin(){
    return this.authService.getUserRole();
  }
}
