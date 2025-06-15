import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServicesComponent } from '../services/services.component';
import { BusinessComponent } from '../business/business.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, BusinessComponent, ServicesComponent],
  templateUrl: './home.component.html',
})
export default class HomeComponent {

}
