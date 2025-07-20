import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ServicesService } from '../services.service';
import { firstValueFrom } from 'rxjs';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { SharedService } from '../../../../shared/services/shared.service';
import { ServiceFormComponent } from "../service-form/service-form.component";

@Component({
  selector: 'app-update-service',
  standalone: true,
  imports: [FormsModule, CommonModule, ServiceFormComponent],
  template: `
<div>
  <app-service-form
    [mode]="'update'"
    [modalId]="'updateServiceModal'"
    [serviceFormData]="serviceFormData"
    [isSaving]="isSaving"
    (close)="onClose()"
    (submitForm)="handleSubmit($event)">
  </app-service-form>
<div>
`,
})
export class UpdateServiceComponent {
  constructor(
    private servicesService: ServicesService,
    private sharedService: SharedService
  ) { }

  @Input() serviceFormData: ServiceInterface = {
    id: '',
    title: '',
    price: 0,
    duration: 0,
    description: '',
    image: null,
  };

  @Output() closeModal = new EventEmitter<void>();
  isSaving = false;

  onClose() {
    this.closeModal.emit();
  }

  handleInputChange(field: keyof ServiceInterface, event: Event) {
    const value = (event.target as HTMLInputElement).value;

    if (!this.serviceFormData) return;

    if (field === 'price') {
      const parsed = parseFloat(value);
      this.serviceFormData.price = isNaN(parsed) ? 0 : parsed;
    } else if (field === 'duration') {
      const parsed = parseInt(value, 10);
      this.serviceFormData.duration = isNaN(parsed) ? 0 : parsed;
    } else {
      this.serviceFormData[field] = value;
    }
  }

  handleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file?.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', text: 'Por favor selecciona solo imágenes.' });
      return;
    }

    this.serviceFormData.image = file;
  }

  async handleSubmit(serviceData: ServiceInterface) {
    if (!serviceData.title?.trim()) {
      Swal.fire({ icon: 'warning', text: 'El nombre del servicio es obligatorio.' });
      return;
    }

    if (!serviceData.price || serviceData.price <= 0) {
      Swal.fire({ icon: 'warning', text: 'El precio debe ser mayor a 0.' });
      return;
    }

    if (!serviceData.duration || serviceData.duration <= 0) {
      Swal.fire({ icon: 'warning', text: 'La duración debe ser mayor a 0.' });
      return;
    }

    this.isSaving = true;

    const formData = new FormData();
    formData.append('id', String(serviceData.id ?? ''));
    formData.append('title', serviceData.title.trim());
    formData.append('price', String(serviceData.price));
    formData.append('duration', String(serviceData.duration));
    formData.append('description', serviceData.description?.trim() ?? '');

    if (serviceData.image instanceof File) {
      formData.append('image', serviceData.image);
    }

    try {
      await firstValueFrom(
        this.servicesService.updateService(serviceData.id!, formData)
      );
      await this.sharedService.loadAllServices();
      Swal.fire({
        title: 'Servicio actualizado correctamente',
        icon: 'success',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#22c55e',
      });
      this.onClose();
    } catch (error) {
      console.error('Error actualizando servicio:', error);
      Swal.fire({ icon: 'error', text: 'Error actualizando servicio. Intenta de nuevo.' });
    } finally {
      this.isSaving = false;
    }
  }
}