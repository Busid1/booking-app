import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import BusinessCardComponent from '../business-card/business-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, BusinessCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export default class HomeComponent {

}
