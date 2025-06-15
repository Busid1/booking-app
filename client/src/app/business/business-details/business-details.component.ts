import { Component } from '@angular/core';
import { BusinessHoursComponent } from './business-hours/business-hours.component';

@Component({
  selector: 'app-business-details',
  standalone: true,
  imports: [BusinessHoursComponent],
  templateUrl: './business-details.component.html',
  styleUrl: './business-details.component.scss'
})
export class BusinessDetailsComponent {

}
