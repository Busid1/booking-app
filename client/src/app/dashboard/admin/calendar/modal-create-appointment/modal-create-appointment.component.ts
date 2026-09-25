import { Component, computed, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from '../../../../booking/appointment.service';
import { SharedService } from '../../../../shared/services/shared.service';
import { ModalComponent } from '../../../../shared/services/modal.component';
import { AppointmentInterface } from '../../../../shared/interfaces/appointment.interface';
import { addMinutes, isPast, mondayBasedDay, todayKey, toMinutes } from '../../../../shared/services/time.utils';
import { alerts } from '../../../../shared/services/alerts';

interface AppointmentForm {
  serviceId: string;
  date: string;
  startTime: string;
  clientName: string;
}

/** Formulario (modal) para crear o editar citas desde el panel de administración. */
@Component({
  selector: 'app-modal-create-appointment',
  templateUrl: './modal-create-appointment.component.html',
  imports: [FormsModule, CurrencyPipe, ModalComponent],
  standalone: true,
})
export class ModalCreateAppointmentComponent implements OnChanges {
  private appointmentsService = inject(AppointmentService);
  readonly store = inject(SharedService);

  @Input() open = false;
  /** Fecha preseleccionada (al crear desde el calendario). */
  @Input() date = '';
  @Input() time = '';
  /** Si se pasa una cita, el formulario funciona en modo edición. */
  @Input() appointment: AppointmentInterface | null = null;
  @Output() closeModal = new EventEmitter<void>();

  readonly isSaving = signal(false);
  readonly form = signal<AppointmentForm>({ serviceId: '', date: '', startTime: '', clientName: '' });
  readonly minDate = todayKey();

  readonly selectedService = computed(() => this.store.services().find(s => s.id === this.form().serviceId) ?? null);
  readonly endTime = computed(() => {
    const service = this.selectedService();
    const start = this.form().startTime;
    return service && start ? addMinutes(start, service.duration) : '';
  });

  /** Aviso (no bloqueante) si la cita queda fuera del horario del negocio. */
  readonly outsideHours = computed(() => {
    const { date, startTime } = this.form();
    const end = this.endTime();
    if (!date || !startTime || !end) return false;
    const day = this.store.weekSchedule()[mondayBasedDay(date)];
    return day.isClosed || !day.timeBlocks.some(b => b.openTime <= startTime && end <= b.closeTime);
  });

  get isEdit(): boolean {
    return !!this.appointment;
  }

  ngOnChanges() {
    if (!this.open) return;
    if (!this.store.servicesLoaded()) this.store.loadAllServices().catch(() => undefined);

    const a = this.appointment;
    this.form.set(a
      ? { serviceId: a.serviceId, date: a.date, startTime: a.startTime, clientName: a.clientName || a.user?.name || '' }
      : { serviceId: '', date: this.date || todayKey(), startTime: this.time, clientName: '' });
  }

  patch(changes: Partial<AppointmentForm>) {
    this.form.update(f => ({ ...f, ...changes }));
  }

  private validate(): string | null {
    const f = this.form();
    if (!f.serviceId) return 'Selecciona un servicio';
    if (!f.date) return 'Selecciona una fecha';
    if (!f.startTime) return 'Indica la hora de inicio';
    if (!f.clientName.trim()) return 'Indica el nombre del cliente';
    if (toMinutes(this.endTime()) <= toMinutes(f.startTime)) return 'La cita no puede terminar después de medianoche';
    if (!this.isEdit && isPast(f.date, f.startTime)) return 'No se pueden crear citas en el pasado';
    return null;
  }

  async handleSubmit() {
    const error = this.validate();
    if (error) {
      alerts.warning(error);
      return;
    }

    const f = this.form();
    const payload = { ...f, clientName: f.clientName.trim(), endTime: this.endTime() };
    this.isSaving.set(true);
    try {
      if (this.appointment?.id) {
        await firstValueFrom(this.appointmentsService.updateAppointment(this.appointment.id, payload));
        alerts.success('Cita actualizada');
      } else {
        await firstValueFrom(this.appointmentsService.createAppointment(payload));
        alerts.success('Cita creada');
      }
      await this.store.loadAllAppointments();
      this.closeModal.emit();
    } catch (err) {
      alerts.error(err, 'No se ha podido guardar la cita');
    } finally {
      this.isSaving.set(false);
    }
  }
}
