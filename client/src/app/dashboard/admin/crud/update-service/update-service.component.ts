import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ServicesService } from '../services.service';
import { firstValueFrom } from 'rxjs';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { SharedService } from '../../../../shared/services/shared.service';

@Component({
  selector: 'app-update-service',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './update-service.component.html',
  styleUrl: './update-service.component.scss'
})

export class UpdateServiceComponent {
  constructor(private servicesService: ServicesService, private sharedService: SharedService) { }
  @Input() serviceFormData: ServiceInterface | null = null;
  @Output() closeModal = new EventEmitter<void>();

  onClose() {
    this.closeModal.emit();
  }

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

  handleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file?.type.startsWith('image/')) {
      alert('Por favor selecciona solo imágenes');
      return;
    }
    
    if (this.serviceFormData) {
      this.serviceFormData.image = file;
    }
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    const formData = new FormData();
    if(this.serviceFormData){
      formData.append('id', String(this.serviceFormData.id ?? ''));
      formData.append('title', this.serviceFormData.title);
      formData.append('price', String(this.serviceFormData.price));
      formData.append('duration', String(this.serviceFormData.duration));
      formData.append('description', this.serviceFormData.description ?? '');
      if (this.serviceFormData.image instanceof File) {
        formData.append('image', this.serviceFormData.image);
      }
    }
    
    try {
      if (!this.serviceFormData) {
        console.error('Service form data is not defined.');
        return;
      }
      await firstValueFrom(this.servicesService.updateService(this.serviceFormData.id!, formData));
      await this.sharedService.loadAllServices();
      Swal.fire({
        title: "Servicio actualizado correctamente",
        confirmButtonText: "Ok",
        confirmButtonColor: "#22c55e",
      })
      this.onClose()
    } catch (error) {
      console.error('Error updating service:', error);
    }
  }
}
