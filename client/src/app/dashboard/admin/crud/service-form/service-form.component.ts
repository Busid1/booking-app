import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
    (this.serviceFormData as any)[field] = value;
  }

  handleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.serviceFormData.image = file ?? null;
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
