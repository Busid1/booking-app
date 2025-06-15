import { Component, Input } from '@angular/core';
import { ServicesService } from '../services.service';
import { firstValueFrom } from 'rxjs';
import { ServiceInterface } from '../../../shared/interfaces/service.interface';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-update-service',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './update-service.component.html',
  styleUrl: './update-service.component.scss'
})

export class UpdateServiceComponent{
  constructor(private servicesService: ServicesService) { }
  @Input() serviceFormData: ServiceInterface | null = null;

  handleInputChange(field: string, event: Event) {
    let value = (event.target as HTMLInputElement).value;
    if (field === "price" && value.length > 4) {
      value = value.slice(0, 3);
      (event.target as HTMLInputElement).value = value;
    }
    if (field === "duration" && value.length > 4) {
      (event.target as HTMLInputElement).value = value;
    }    
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    try {
      if (!this.serviceFormData) {
        console.error('Service form data is not defined.');
        return;
      }
      await firstValueFrom(this.servicesService.updateService(this.serviceFormData));
    } catch (error) {
      console.error('Error updating service:', error);
    }
  }
}
