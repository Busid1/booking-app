import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../services.service';
import { SharedService } from '../../../../shared/services/shared.service';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import { ServiceFormComponent } from '../service-form/service-form.component';
import { buildServiceFormData } from '../service-form.utils';
import { alerts } from '../../../../shared/services/alerts';

@Component({
  selector: 'app-update-service',
  standalone: true,
  imports: [ServiceFormComponent],
  template: `
    <app-service-form mode="update" [open]="open" [service]="service" [isSaving]="isSaving()"
      (close)="closeModal.emit()" (submitForm)="handleSubmit($event)" />
  `,
})
export class UpdateServiceComponent {
  private api = inject(ServicesService);
  private store = inject(SharedService);

  @Input() open = false;
  @Input() service: ServiceInterface | null = null;
  @Output() closeModal = new EventEmitter<void>();

  readonly isSaving = signal(false);

  async handleSubmit(service: ServiceInterface) {
    if (!service.id) return;
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.api.updateService(service.id, buildServiceFormData(service)));
      await this.store.loadAllServices();
      alerts.success('Servicio actualizado');
      this.closeModal.emit();
    } catch (error) {
      alerts.error(error, 'No se ha podido actualizar el servicio');
    } finally {
      this.isSaving.set(false);
    }
  }
}
