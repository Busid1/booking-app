import { Component, EventEmitter, Output } from '@angular/core';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../services.service';
import { SharedService } from '../../../../shared/services/shared.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create-service',
  standalone: true,
  imports: [],
  templateUrl: './create-service.component.html',
  styleUrl: './create-service.component.scss'
})
export class CreateServiceComponent {
  constructor(private servicesService: ServicesService, private sharedService: SharedService) { }
  @Output() closeModal = new EventEmitter<void>();

  onClose() {
    this.closeModal.emit();
  }

  serviceFormData: ServiceInterface = {
    title: '',
    price: 0,
    duration: 0,
    description: '',
    image: '',
  };

  handleInputChange(field: string, event: Event) {
    let value = (event.target as HTMLInputElement).value;
    if (field === "price" && value.length > 4) {
      value = value.slice(0, 3);
      (event.target as HTMLInputElement).value = value;
    }
    if (field === "duration" && value.length > 4) {
      (event.target as HTMLInputElement).value = value;
    }
    this.serviceFormData[field as 'title' | 'description'] = value
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    try {
      await firstValueFrom(this.servicesService.createService(this.serviceFormData));
      Swal.fire({
        title: "Servicio creado correctamente",
        confirmButtonText: "Ok",
        confirmButtonColor: "#22c55e",
      })
      await this.sharedService.loadAllServices();
      this.onClose();
    } catch (error) {
      console.error('Error creating service:', error);
    }
  }
}
