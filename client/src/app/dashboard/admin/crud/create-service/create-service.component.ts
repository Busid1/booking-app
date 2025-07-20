import { Component, EventEmitter, Input, Output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../services.service';
import { SharedService } from '../../../../shared/services/shared.service';
import { CommonModule } from '@angular/common';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import Swal from 'sweetalert2';
import { ServiceFormComponent } from '../service-form/service-form.component';

@Component({
  selector: 'app-create-service',
  standalone: true,
  imports: [CommonModule, ServiceFormComponent],
  template: `
<div>
  <app-service-form
    [mode]="'create'"
    [modalId]="'createServiceModal'"
    [serviceFormData]="serviceFormData"
    [isSaving]="isSaving"
    (close)="onClose()"
    (submitForm)="handleSubmit($event)">
  </app-service-form>
</div>
`,
})
export class CreateServiceComponent {
  constructor(
    private servicesService: ServicesService,
    private sharedService: SharedService
  ) { }

  @Output() closeModal = new EventEmitter<void>();

  isSaving = false;

  serviceFormData: ServiceInterface = {
    title: '',
    price: 0,
    duration: 0,
    description: '',
    image: null,
  };

  onClose() {
    this.closeModal.emit();
  }

  async handleSubmit(service: ServiceInterface) {
    if (!service.title?.trim()) {
      Swal.fire({ icon: 'warning', text: 'El nombre del servicio es obligatorio.' });
      return;
    }
    if (!service.price || service.price <= 0) {
      Swal.fire({ icon: 'warning', text: 'El precio debe ser mayor a 0.' });
      return;
    }
    if (!service.duration || service.duration <= 0) {
      Swal.fire({ icon: 'warning', text: 'La duración debe ser mayor a 0.' });
      return;
    }

    this.isSaving = true;

    const formData = new FormData();
    formData.append('title', service.title.trim());
    formData.append('price', String(service.price));
    formData.append('duration', String(service.duration));
    formData.append('description', service.description?.trim() ?? '');

    if (service.image instanceof File) {
      formData.append('image', service.image);
    }

    try {
      const response = await firstValueFrom(this.servicesService.createService(formData));
      // console.log(response);
      
      Swal.fire({
        title: 'Servicio creado correctamente',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#22c55e',
      });
      await this.sharedService.loadAllServices();
      this.onClose();
    } catch (error) {
      console.error('Error creando servicio:', error);
      Swal.fire({ icon: 'error', text: 'Error creando servicio. Intenta de nuevo.' });
    } finally {
      this.isSaving = false;
    }
  }
}