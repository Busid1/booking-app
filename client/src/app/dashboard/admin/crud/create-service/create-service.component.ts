import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../services.service';
import { SharedService } from '../../../../shared/services/shared.service';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import { ServiceFormComponent } from '../service-form/service-form.component';
import { buildServiceFormData } from '../service-form.utils';
import { alerts } from '../../../../shared/services/alerts';

@Component({
  selector: 'app-create-service',
  standalone: true,
  imports: [ServiceFormComponent],
  template: `
    <app-service-form mode="create" [open]="open" [isSaving]="isSaving()" (close)="closeModal.emit()" (submitForm)="handleSubmit($event)" />
  `,
})
export class CreateServiceComponent {
  private api = inject(ServicesService);
  private store = inject(SharedService);

  @Input() open = false;
  @Output() closeModal = new EventEmitter<void>();

  readonly isSaving = signal(false);

  async handleSubmit(service: ServiceInterface) {
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.api.createService(buildServiceFormData(service)));
      await this.store.loadAllServices();
      alerts.success('Servicio creado');
      this.closeModal.emit();
    } catch (error) {
      alerts.error(error, 'No se ha podido crear el servicio');
    } finally {
      this.isSaving.set(false);
    }
  }
}
