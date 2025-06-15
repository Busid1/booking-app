import { Component } from '@angular/core';
import BusinessCardComponent from './business-card/business-card.component';
import { BusinessDetailsComponent } from './business-details/business-details.component';

@Component({
  selector: 'app-business',
  standalone: true,
  imports: [BusinessCardComponent, BusinessDetailsComponent],
  templateUrl: './business.component.html',
})
export class BusinessComponent {

}
