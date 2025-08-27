import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-service-form',
  templateUrl: './service-form.component.html',
  styleUrl: './service-form.component.scss',
  imports: [FormsModule, CommonModule],
  standalone: true
})
export class ServiceFormComponent {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() serviceFormData: ServiceInterface = {
    title: '',
    price: 0,
    duration: 0,
    description: '',
    image: null,
  };

  @Input() isSaving = false;
  @Input() modalId: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<ServiceInterface>();

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


  onSubmit(event: Event) {
    event.preventDefault();
    this.submitForm.emit(this.serviceFormData);
  }

  onClose() {
    (document.activeElement as HTMLElement)?.blur()
    this.close.emit();
  }
}
