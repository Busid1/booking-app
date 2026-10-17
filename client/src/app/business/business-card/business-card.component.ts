import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { SharedService } from '../../shared/services/shared.service';
import { BusinessHoursComponent } from '../business-hours/business-hours.component';
import { ModalComponent } from '../../shared/services/modal.component';
import { BusinessInfoInterface } from '../../shared/interfaces/business-info.interface';
import { DAY_NAMES, mondayBasedDay } from '../../shared/services/time.utils';
import { alerts } from '../../shared/services/alerts';

/** Tarjetas de contacto y horario del negocio, con edición para el administrador. */
@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [FormsModule, BusinessHoursComponent, ModalComponent],
  templateUrl: './business-card.component.html',
})
export default class BusinessCardComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(SharedService);
  private api = inject(ServicesService);

  readonly info = this.store.businessInfo;
  readonly schedule = this.store.weekSchedule;
  readonly today = mondayBasedDay(new Date());
  readonly dayNames = DAY_NAMES;

  readonly mapsUrl = computed(() =>
    this.info().address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.info().address)}` : '',
  );
  readonly telUrl = computed(() => `tel:${this.info().phone.replace(/[^\d+]/g, '')}`);

  // Edición de información
  readonly isEditOpen = signal(false);
  readonly isSaving = signal(false);
  readonly isHoursOpen = signal(false);
  form: Omit<BusinessInfoInterface, 'images'> = { name: '', description: '', address: '', phone: '', email: '' };

  openEdit() {
    const { name, description, address, phone, email } = this.info();
    this.form = { name, description, address, phone, email };
    this.isEditOpen.set(true);
  }

  async saveInfo() {
    if (!this.form.name.trim()) {
      alerts.warning('El nombre del negocio es obligatorio');
      return;
    }
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.api.saveBusinessInfo(this.form));
      await this.store.loadBusinessInfo();
      alerts.success('Información actualizada');
      this.isEditOpen.set(false);
    } catch (error) {
      alerts.error(error, 'No se ha podido guardar la información');
    } finally {
      this.isSaving.set(false);
    }
  }
}
